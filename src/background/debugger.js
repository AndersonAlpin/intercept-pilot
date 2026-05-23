import { isCrossExtensionAccessError, isHttpUrl } from '../shared/utils.js'
import { KNOWN_EXTENSIONS } from '../shared/known-extensions.js'
import { runtimeState, getAttachedDebuggee, resetRuntimeCollections } from './runtime-state.js'
import { pushLog } from './logger.js'

const SESSION_KEYS = ['attachedTabId', 'attachedDebuggee']
const FETCH_PATTERNS = [
  { urlPattern: 'http://*', requestStage: 'Request' },
  { urlPattern: 'https://*', requestStage: 'Request' },
  { urlPattern: 'http://*', requestStage: 'Response' },
  { urlPattern: 'https://*', requestStage: 'Response' }
]

async function persistAttachedSession() {
  if (!chrome.storage?.session) return
  await chrome.storage.session
    .set({
      attachedTabId: runtimeState.attachedTabId,
      attachedDebuggee: runtimeState.attachedDebuggee
    })
    .catch(() => {})
}

export async function clearPersistedAttachedSession() {
  if (!chrome.storage?.session) return
  await chrome.storage.session.remove(SESSION_KEYS).catch(() => {})
}

let rehydrationPromise = null

export function ensureRehydrated() {
  if (!rehydrationPromise) rehydrationPromise = rehydrateFromSession()
  return rehydrationPromise
}

async function rehydrateFromSession() {
  if (!chrome.storage?.session) return false
  const stored = await chrome.storage.session.get(SESSION_KEYS).catch(() => null)
  const attachedTabId = stored?.attachedTabId
  const attachedDebuggee = stored?.attachedDebuggee
  if (!attachedTabId) return false

  const debuggee = attachedDebuggee || { tabId: attachedTabId }
  const stillAttached = await verifyDebuggeeStillAttached(debuggee)
  if (!stillAttached) {
    await clearPersistedAttachedSession()
    return false
  }

  runtimeState.attachedTabId = attachedTabId
  runtimeState.attachedDebuggee = debuggee
  return true
}

async function verifyDebuggeeStillAttached(debuggee) {
  try {
    await chrome.debugger.sendCommand(debuggee, 'Browser.getVersion')
    return true
  } catch {
    return false
  }
}

export async function sendAttachedCommand(method, params = {}) {
  const debuggee = getAttachedDebuggee()
  if (!debuggee) throw new Error('Debugger is not attached')
  return chrome.debugger.sendCommand(debuggee, method, params)
}

async function enableAttachedDomains() {
  await sendAttachedCommand('Network.enable')
  await sendAttachedCommand('Runtime.enable')
  await sendAttachedCommand('Fetch.enable', { patterns: FETCH_PATTERNS })
  runtimeState.fetchEnabled = true
  runtimeState.debuggerDomainsReadyAt = Date.now()
  runtimeState.debuggerDomainsReadyForTabId = runtimeState.attachedTabId
}

export async function ensureAttachedDomainsReady(tabId = runtimeState.attachedTabId) {
  if (!tabId) throw new Error('attachNoTab')
  await ensureRehydrated()
  if (runtimeState.attachedTabId !== tabId) return attachToTab(tabId)

  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (!isHttpUrl(tab?.url || '')) throw new Error('attachHttpOnly')

  await enableAttachedDomains()
  return {
    attachedTabId: tabId,
    attachedVia: runtimeState.attachedDebuggee?.targetId ? 'targetId' : 'tabId',
    domainsReady: true
  }
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

async function getCrossExtensionFrameIdsViaWebNavigation(tabId) {
  if (!tabId || !chrome.webNavigation?.getAllFrames) return []
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => [])
  if (!Array.isArray(frames)) return []

  const ownExtensionId = chrome.runtime.id
  const extensionIds = new Set()
  for (const frame of frames) {
    const url = String(frame?.url || '')
    const match = url.match(/^chrome-extension:\/\/([^/]+)\//i)
    if (!match?.[1]) continue
    if (match[1] === ownExtensionId) continue
    extensionIds.add(match[1])
  }
  return [...extensionIds]
}

async function getCrossExtensionFrameIdsViaDom(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) return []
  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId, allFrames: false },
      world: 'MAIN',
      func: ownExtensionId => {
        const iframes = Array.from(document.querySelectorAll('iframe[src^="chrome-extension://"]'))
        const extensionIds = new Set()
        for (const iframe of iframes) {
          const src = String(iframe.getAttribute('src') || '')
          const match = src.match(/^chrome-extension:\/\/([^/]+)\//i)
          if (!match?.[1]) continue
          if (match[1] === ownExtensionId) continue
          extensionIds.add(match[1])
        }
        return [...extensionIds]
      },
      args: [chrome.runtime.id]
    })
    return Array.isArray(result?.result) ? result.result : []
  } catch {
    return []
  }
}

async function getCrossExtensionFrameIds(tabId) {
  const viaWebNav = await getCrossExtensionFrameIdsViaWebNavigation(tabId)
  if (viaWebNav.length) return viaWebNav
  return await getCrossExtensionFrameIdsViaDom(tabId)
}

async function resolveExtensionLabel(id) {
  if (!id) return ''
  if (chrome.management?.get) {
    try {
      const info = await chrome.management.get(id)
      if (info?.name) return `${info.name} (${id})`
    } catch {
      // Permission missing, extension uninstalled, or other error — fall through
    }
  }
  const known = KNOWN_EXTENSIONS[id]
  if (known) return `${known} (${id})`
  return id
}

async function resolveExtensionLabels(ids) {
  if (!Array.isArray(ids) || !ids.length) return []
  return Promise.all(ids.map(id => resolveExtensionLabel(id)))
}

function buildCrossExtensionErrorCode(labels) {
  const list = Array.isArray(labels) ? labels.filter(Boolean) : []
  if (!list.length) return 'attachCrossExtension'
  return `attachCrossExtension:${JSON.stringify(list)}`
}

export async function attachToTab(tabId) {
  if (!tabId) throw new Error('attachNoTab')
  if (runtimeState.attachedTabId === tabId) return ensureAttachedDomainsReady(tabId)

  const tab = await chrome.tabs.get(tabId)
  if (!isHttpUrl(tab?.url || '')) throw new Error('attachHttpOnly')

  if (runtimeState.attachedTabId && runtimeState.attachedTabId !== tabId) {
    await detachCurrentTab().catch(() => {})
  }

  runtimeState.attachingTabId = tabId
  try {
    let attachedVia = 'tabId'
    let attachedTargetId = null

    try {
      await chrome.debugger.attach({ tabId }, '1.3')
    } catch (initialError) {
      if (isCrossExtensionAccessError(initialError)) {
        const ids = await getCrossExtensionFrameIds(tabId)
        const labels = await resolveExtensionLabels(ids)
        const labelText = labels.length ? labels.join(', ') : 'unknown'
        await pushLog({
          level: 'error',
          scope: 'debugger',
          message: `Attach blocked by other extension(s) on the page: ${labelText}. Disable them, reload the page and try Attach again.`,
          url: tab.url || ''
        }).catch(() => {})
        throw new Error(buildCrossExtensionErrorCode(labels))
      }
      const fallbackTargetId = await findPageTargetIdForTab(tabId)
      if (!fallbackTargetId) throw new Error('attachCannotAttach')
      await chrome.debugger.attach({ targetId: fallbackTargetId }, '1.3')
      attachedVia = 'targetId'
      attachedTargetId = fallbackTargetId
    }

    runtimeState.attachedTabId = tabId
    runtimeState.attachedDebuggee = attachedVia === 'targetId' ? { targetId: attachedTargetId } : { tabId }
    runtimeState.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })
    if (runtimeState.networkTabId != null && runtimeState.networkTabId !== tabId) {
      resetRuntimeCollections()
    }
    runtimeState.networkTabId = tabId
    await persistAttachedSession()

    await enableAttachedDomains()

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
  runtimeState.debuggerDomainsReadyAt = null
  runtimeState.debuggerDomainsReadyForTabId = null
  runtimeState.currentNetworkCycleId = null
  runtimeState.currentNavigationStartedAt = null
  runtimeState.networkCycleInProgressTabId = null
  await clearPersistedAttachedSession()
  return { attachedTabId: null }
}
