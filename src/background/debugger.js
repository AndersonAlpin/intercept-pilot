import { isHttpUrl } from '../shared/utils.js'
import { runtimeState, getAttachedDebuggee, resetRuntimeCollections } from './runtime-state.js'

export async function sendAttachedCommand(method, params = {}) {
  const debuggee = getAttachedDebuggee()
  if (!debuggee) throw new Error('Debugger is not attached')
  return chrome.debugger.sendCommand(debuggee, method, params)
}

export function isAttachedSource(source) {
  if (!source) return false
  if (source.tabId && runtimeState.attachedTabId && source.tabId === runtimeState.attachedTabId) return true
  if (source.targetId && runtimeState.attachedDebuggee?.targetId && source.targetId === runtimeState.attachedDebuggee.targetId) return true
  return false
}

export async function findPageTargetIdForTab(tabId) {
  const targets = await chrome.debugger.getTargets()
  const pageTarget = targets.find(target => target && target.tabId === tabId && target.type === 'page' && isHttpUrl(target.url || ''))
  return pageTarget?.id || null
}

export async function attachToTab(tabId) {
  if (!tabId) throw new Error('No tab available to attach')
  if (runtimeState.attachedTabId === tabId) return { attachedTabId: tabId }

  const tab = await chrome.tabs.get(tabId)
  if (!isHttpUrl(tab?.url || '')) throw new Error('Attach only works on HTTP(S) tabs.')

  if (runtimeState.attachedTabId && runtimeState.attachedTabId !== tabId) {
    await detachCurrentTab().catch(() => {})
  }

  runtimeState.attachingTabId = tabId
  try {
    let attachedVia = 'tabId'
    let attachedTargetId = null

    try {
      await chrome.debugger.attach({ tabId }, '1.3')
    } catch {
      const targetId = await findPageTargetIdForTab(tabId)
      if (!targetId) throw new Error('Cannot attach debugger to this tab.')
      await chrome.debugger.attach({ targetId }, '1.3')
      attachedVia = 'targetId'
      attachedTargetId = targetId
    }

    runtimeState.attachedTabId = tabId
    runtimeState.attachedDebuggee = attachedVia === 'targetId' ? { targetId: attachedTargetId } : { tabId }
    runtimeState.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })
    resetRuntimeCollections()

    await sendAttachedCommand('Network.enable').catch(() => {})
    await sendAttachedCommand('Fetch.enable', {
      patterns: [
        { urlPattern: 'http://*', requestStage: 'Request' },
        { urlPattern: 'https://*', requestStage: 'Request' },
        { urlPattern: 'http://*', requestStage: 'Response' },
        { urlPattern: 'https://*', requestStage: 'Response' }
      ]
    }).catch(() => {})

    return { attachedTabId: tabId, attachedVia }
  } finally {
    runtimeState.attachingTabId = null
  }
}

export async function detachCurrentTab() {
  if (!runtimeState.attachedTabId) return { attachedTabId: null }
  const debuggee = getAttachedDebuggee() || { tabId: runtimeState.attachedTabId }
  await chrome.debugger.detach(debuggee).catch(() => {})
  runtimeState.attachedTabId = null
  runtimeState.attachedDebuggee = null
  runtimeState.fetchEnabled = false
  resetRuntimeCollections()
  return { attachedTabId: null }
}
