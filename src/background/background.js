import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants.js'
import { ensureState, getState, saveCollection, deleteCollection, saveRule, deleteRule, updateRuleEnabled, updateSettings, setLogs } from '../shared/storage.js'
import { validateRule } from '../shared/validators.js'
import { clone, isHttpUrl, uid } from '../shared/utils.js'
import { makeRule } from '../shared/models.js'
import { attachToTab, detachCurrentTab, isAttachedSource, sendAttachedCommand } from './debugger.js'
import { runtimeState } from './runtime-state.js'
import { pushLog } from './logger.js'
import { detectSimpleConflicts, findMatchingRule } from './rule-engine.js'

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {})
}

function encodeBody(body) {
  return btoa(unescape(encodeURIComponent(String(body || ''))))
}

function parseHeaderLines(raw = '') {
  return String(raw)
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const idx = line.indexOf(':')
      if (idx === -1) return null
      return { name: line.slice(0, idx).trim(), value: line.slice(idx + 1).trim() }
    })
    .filter(Boolean)
}

function stringifyConsoleArg(arg) {
  if (arg == null) return ''
  if (arg.value != null) return String(arg.value)
  if (arg.unserializableValue != null) return String(arg.unserializableValue)
  if (arg.description) return String(arg.description)
  if (arg.type === 'undefined') return 'undefined'
  if (arg.type === 'object' && arg.subtype === 'null') return 'null'
  if (arg.type) return `[${arg.type}]`
  return ''
}

function getRuntimeEventUrl(params = {}) {
  const directUrl = String(params?.url || '')
  if (directUrl) return directUrl
  const firstFrameUrl = String(params?.stackTrace?.callFrames?.[0]?.url || '')
  if (firstFrameUrl) return firstFrameUrl
  const parentFrameUrl = String(params?.stackTrace?.parent?.callFrames?.[0]?.url || '')
  if (parentFrameUrl) return parentFrameUrl
  const exceptionFrameUrl = String(params?.exceptionDetails?.stackTrace?.callFrames?.[0]?.url || '')
  if (exceptionFrameUrl) return exceptionFrameUrl
  return ''
}

function getRequestHeader(params, headerName) {
  const target = String(headerName || '').toLowerCase()
  const headers = params?.request?.headers
  if (!headers || typeof headers !== 'object') return ''
  for (const [name, value] of Object.entries(headers)) {
    if (String(name).toLowerCase() !== target) continue
    return String(value ?? '')
  }
  return ''
}

function ensureResponseHeader(headers, name, value) {
  const target = String(name || '').toLowerCase()
  if (!target || value == null) return headers
  const hasHeader = headers.some(item => String(item?.name || '').toLowerCase() === target)
  if (!hasHeader) headers.push({ name: String(name), value: String(value) })
  return headers
}

function getEntryKey(params) {
  return params.networkId || params.requestId
}

function rebuildNetworkIndex() {
  runtimeState.networkIndex.clear()
  runtimeState.networkEntries.forEach((entry, index) => runtimeState.networkIndex.set(entry.id, index))
}

function upsertNetworkEntry(key, patch, max = 300) {
  const index = runtimeState.networkIndex.get(key)
  if (index == null) {
    const entry = {
      id: key,
      requestId: patch.requestId || key,
      networkId: patch.networkId || key,
      url: '',
      method: '',
      status: null,
      statusText: '',
      resourceType: '',
      startedAt: Date.now(),
      endedAt: null,
      durationMs: null,
      matchedRuleId: null,
      matchedRuleName: null,
      appliedAction: 'passThrough',
      intercepted: false,
      responseHeaders: [],
      responseMimeType: '',
      errorText: '',
      ...patch
    }
    runtimeState.networkEntries.unshift(entry)
    if (runtimeState.networkEntries.length > max) runtimeState.networkEntries = runtimeState.networkEntries.slice(0, max)
    rebuildNetworkIndex()
    return entry
  }

  const current = runtimeState.networkEntries[index]
  const next = { ...current, ...patch }
  if (next.startedAt && next.endedAt) next.durationMs = Math.max(0, next.endedAt - next.startedAt)
  runtimeState.networkEntries[index] = next
  return next
}

function publishNetwork() {
  broadcast({ type: 'state:network', networkEntries: runtimeState.networkEntries.slice(0, 200) })
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  return tabs[0] || null
}

function toTabRef(tab) {
  if (!tab || !tab.id) return null
  return {
    id: tab.id,
    url: tab.url || '',
    title: tab.title || '',
    index: Number(tab.index ?? -1),
    position: Number(tab.index ?? -1) + 1
  }
}

function isAttachableTab(tab) {
  return Boolean(tab?.id && isHttpUrl(tab?.url || ''))
}

function getEffectiveCandidateTab() {
  return runtimeState.candidateTab || runtimeState.lastAttachableTab || null
}

async function getAttachedTabRef() {
  if (!runtimeState.attachedTabId) return null
  const fromActive = runtimeState.activeTab?.id === runtimeState.attachedTabId ? runtimeState.activeTab : null
  if (fromActive) return fromActive
  const tab = await chrome.tabs.get(runtimeState.attachedTabId).catch(() => null)
  if (!tab) return null
  return toTabRef(tab)
}

async function updateConnectionFromActiveTab() {
  const activeTab = await getActiveTab().catch(() => null)
  const activeRef = toTabRef(activeTab)
  runtimeState.activeTab = activeRef
  if (isAttachableTab(activeRef)) {
    runtimeState.candidateTab = activeRef
    runtimeState.lastAttachableTab = activeRef
  } else if (!runtimeState.candidateTab || runtimeState.candidateTab.id === activeRef?.id) {
    runtimeState.candidateTab = runtimeState.lastAttachableTab
  }
}

async function broadcastConnectionState() {
  const attachedTab = await getAttachedTabRef()
  broadcast({
    type: 'state:connection',
    attachedTabId: runtimeState.attachedTabId,
    attachedTab,
    activeTab: runtimeState.activeTab,
    candidateTab: getEffectiveCandidateTab(),
    lastAttachableTab: runtimeState.lastAttachableTab
  })
}

async function resolveAttachTargetTab(message, sender) {
  const explicitId = Number(message?.tabId || 0)
  if (explicitId) {
    const explicitTab = await chrome.tabs.get(explicitId).catch(() => null)
    if (isAttachableTab(explicitTab)) return explicitTab
  }

  const senderTabId = sender?.tab?.id
  if (senderTabId) {
    const senderTab = await chrome.tabs.get(senderTabId).catch(() => null)
    if (isAttachableTab(senderTab)) return senderTab
  }

  if (isAttachableTab(runtimeState.candidateTab)) {
    const tab = await chrome.tabs.get(runtimeState.candidateTab.id).catch(() => null)
    if (isAttachableTab(tab)) return tab
  }
  if (isAttachableTab(runtimeState.lastAttachableTab)) {
    const tab = await chrome.tabs.get(runtimeState.lastAttachableTab.id).catch(() => null)
    if (isAttachableTab(tab)) return tab
  }

  const active = await getActiveTab().catch(() => null)
  return isAttachableTab(active) ? active : null
}

async function getFullState() {
  const state = await getState()
  await updateConnectionFromActiveTab()
  const attachedTab = await getAttachedTabRef()

  const conflicts = detectSimpleConflicts(state.rules)
  const rules = state.rules.map(rule => ({
    ...rule,
    diagnostics: {
      ...(rule.diagnostics || {}),
      conflictIds: conflicts.get(rule.id) || []
    }
  }))

  return {
    collections: state.collections,
    rules,
    logs: state.logs,
    settings: state.settings || DEFAULT_SETTINGS,
    networkEntries: runtimeState.networkEntries.slice(0, 200),
    attachedTabId: runtimeState.attachedTabId,
    attachedTab,
    activeTab: runtimeState.activeTab,
    candidateTab: getEffectiveCandidateTab(),
    lastAttachableTab: runtimeState.lastAttachableTab
  }
}

async function maybeAutoAttach() {
  const state = await getState()
  if (!state.settings?.autoAttach) return false
  const targetId = runtimeState.candidateTab?.id || runtimeState.lastAttachableTab?.id
  if (!targetId) return false
  if (runtimeState.attachedTabId === targetId) return false
  if (runtimeState.attachingTabId === targetId) return false
  try {
    const result = await attachToTab(targetId)
    await pushLog({
      level: 'info',
      scope: 'debugger',
      message: `Auto-attached to tab ${targetId} via ${result.attachedVia || 'tabId'}`
    })
    return true
  } catch {
    return false
  }
}

async function maybeAutoReloadAfterRuleChange() {
  const state = await getState()
  if (!state.settings?.autoReloadAfterRuleChange) return false

  if (!runtimeState.attachedTabId && state.settings?.autoAttach) {
    await maybeAutoAttach()
  }

  const targetId = runtimeState.attachedTabId || runtimeState.candidateTab?.id || runtimeState.lastAttachableTab?.id
  if (!targetId) return false
  await chrome.tabs.reload(targetId).catch(() => {})
  return true
}

async function applyRule(params, rule) {
  const action = rule.action || {}
  const actionType = action.type || 'mockResponse'

  const requestKey = getEntryKey(params)
  upsertNetworkEntry(requestKey, {
    id: requestKey,
    requestId: params.requestId,
    networkId: params.networkId,
    url: params.request.url,
    method: params.request.method,
    resourceType: params.resourceType,
    matchedRuleId: rule.id,
    matchedRuleName: rule.name,
    appliedAction: actionType,
    intercepted: actionType !== 'passThrough'
  })
  publishNetwork()

  if (actionType === 'delayOnly' && Number(action.delayMs || 0) > 0) {
    await new Promise(resolve => setTimeout(resolve, Number(action.delayMs)))
  }

  if (actionType === 'failRequest') {
    await sendAttachedCommand('Fetch.failRequest', {
      requestId: params.requestId,
      errorReason: String(action.failReason || 'Failed')
    })
    return
  }

  if (actionType === 'passThrough') {
    await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
    return
  }

  const applyResponseHeaders = action.applyResponseHeaders === true
  const applyResponseBody = action.applyResponseBody !== false

  if (!applyResponseBody) {
    await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
    return
  }

  const headers = applyResponseHeaders ? parseHeaderLines(action.responseHeaders || '') : []
  const contentType = action.contentType || 'application/json'
  const origin = getRequestHeader(params, 'origin')
  const corsOrigin = origin || '*'

  if (applyResponseHeaders) {
    if (!headers.some(h => h.name.toLowerCase() === 'content-type')) {
      headers.push({ name: 'content-type', value: contentType })
    }
  } else {
    // Keep mocks usable by default even when custom headers are disabled.
    ensureResponseHeader(headers, 'content-type', contentType)
  }

  ensureResponseHeader(headers, 'access-control-allow-origin', corsOrigin)
  ensureResponseHeader(headers, 'access-control-allow-credentials', 'true')
  ensureResponseHeader(headers, 'vary', 'Origin')

  if (String(params.request.method || '').toUpperCase() === 'OPTIONS') {
    const reqMethod = getRequestHeader(params, 'access-control-request-method') || 'GET, POST, PUT, PATCH, DELETE, OPTIONS'
    const reqHeaders = getRequestHeader(params, 'access-control-request-headers') || '*'
    ensureResponseHeader(headers, 'access-control-allow-methods', reqMethod)
    ensureResponseHeader(headers, 'access-control-allow-headers', reqHeaders)
  }

  await sendAttachedCommand('Fetch.fulfillRequest', {
    requestId: params.requestId,
    responseCode: Number(action.statusCode || 200),
    responsePhrase: String(action.statusText || 'OK'),
    responseHeaders: headers,
    body: encodeBody(action.responseBody || '{\n  "ok": true\n}')
  })
}

async function handleRequestPaused(source, params) {
  if (!isAttachedSource(source)) return

  if (params.responseStatusCode) {
    await sendAttachedCommand('Fetch.continueResponse', { requestId: params.requestId }).catch(async () => {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {})
    })
    return
  }

  const state = await getState()
  const rule = findMatchingRule(state.rules, state.collections, params.request.url, params.request.method, params.resourceType)

  if (!rule) {
    upsertNetworkEntry(getEntryKey(params), {
      requestId: params.requestId,
      networkId: params.networkId,
      url: params.request.url,
      method: params.request.method,
      resourceType: params.resourceType,
      appliedAction: 'passThrough',
      intercepted: false
    })
    publishNetwork()
    await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
    return
  }

  runtimeState.requestRuleMap.set(getEntryKey(params), rule)
  rule.diagnostics = {
    ...(rule.diagnostics || {}),
    matchCount: Number(rule.diagnostics?.matchCount || 0) + 1,
    lastMatchedAt: new Date().toISOString()
  }
  await saveRule(rule)
  await applyRule(params, rule)
}

function handleNetworkRequestWillBeSent(source, params) {
  if (!isAttachedSource(source)) return
  upsertNetworkEntry(params.requestId, {
    requestId: params.requestId,
    networkId: params.requestId,
    url: params.request.url,
    method: params.request.method,
    resourceType: params.type,
    startedAt: Date.now()
  })
  publishNetwork()
}

function handleNetworkResponseReceived(source, params) {
  if (!isAttachedSource(source)) return
  const key = params.requestId
  const existingRule = runtimeState.requestRuleMap.get(key)
  upsertNetworkEntry(key, {
    status: params.response.status,
    statusText: params.response.statusText || '',
    responseHeaders: Object.entries(params.response.headers || {}).map(([name, value]) => ({ name, value: String(value) })),
    responseMimeType: params.response.mimeType || '',
    resourceType: params.type,
    matchedRuleId: existingRule?.id || null,
    matchedRuleName: existingRule?.name || null,
    appliedAction: existingRule?.action?.type || 'passThrough'
  })
  publishNetwork()
}

function handleLoadingFinished(source, params) {
  if (!isAttachedSource(source)) return
  upsertNetworkEntry(params.requestId, { endedAt: Date.now() })
  publishNetwork()
}

function handleLoadingFailed(source, params) {
  if (!isAttachedSource(source)) return
  upsertNetworkEntry(params.requestId, { endedAt: Date.now(), status: 0, errorText: params.errorText || 'Failed' })
  publishNetwork()
}

async function clearNetworkEntries() {
  runtimeState.networkEntries = []
  runtimeState.networkIndex.clear()
  publishNetwork()
  return []
}

async function handleRuntimeConsoleApiCalled(source, params) {
  if (!isAttachedSource(source)) return
  const levelMap = { error: 'error', warning: 'warn' }
  const level = levelMap[String(params?.type || '').toLowerCase()] || 'info'
  const parts = Array.isArray(params?.args) ? params.args.map(stringifyConsoleArg).filter(Boolean) : []
  const message = parts.join(' ') || `[console.${String(params?.type || 'log')}]`
  const url = getRuntimeEventUrl(params)
  await pushLog({
    level,
    scope: 'web',
    message,
    url
  })
}

async function handleRuntimeExceptionThrown(source, params) {
  if (!isAttachedSource(source)) return
  const details = params?.exceptionDetails || {}
  const exceptionText = String(details?.exception?.description || details?.exception?.value || details?.text || 'Unhandled exception')
  const url = getRuntimeEventUrl(params)
  await pushLog({
    level: 'error',
    scope: 'web',
    message: exceptionText,
    url
  })
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureState()
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (tab) runtimeState.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })
  await updateConnectionFromActiveTab()
  await maybeAutoAttach()
  await broadcastConnectionState()
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    runtimeState.tabMeta.set(tabId, { url: changeInfo.url || tab.url || '', title: changeInfo.title || tab.title || '' })
    const updatedRef = toTabRef(tab)
    if (updatedRef) {
      if (runtimeState.activeTab?.id === tabId) runtimeState.activeTab = updatedRef
      if (runtimeState.candidateTab?.id === tabId) runtimeState.candidateTab = updatedRef
      if (runtimeState.lastAttachableTab?.id === tabId) runtimeState.lastAttachableTab = updatedRef
    }
    if (tab.active) {
      await updateConnectionFromActiveTab()
      await maybeAutoAttach()
      await broadcastConnectionState()
    }
  }
})

chrome.windows.onFocusChanged.addListener(async windowId => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return
  await updateConnectionFromActiveTab()
  await maybeAutoAttach()
  await broadcastConnectionState()
})

chrome.tabs.onRemoved.addListener(async tabId => {
  if (runtimeState.candidateTab?.id === tabId) runtimeState.candidateTab = null
  if (runtimeState.lastAttachableTab?.id === tabId) runtimeState.lastAttachableTab = null
  if (runtimeState.activeTab?.id === tabId) runtimeState.activeTab = null
  await updateConnectionFromActiveTab()
  await maybeAutoAttach()
  await broadcastConnectionState()
})

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  try {
    if (method === 'Fetch.requestPaused') return handleRequestPaused(source, params)
    if (method === 'Network.requestWillBeSent') return handleNetworkRequestWillBeSent(source, params)
    if (method === 'Network.responseReceived') return handleNetworkResponseReceived(source, params)
    if (method === 'Network.loadingFinished') return handleLoadingFinished(source, params)
    if (method === 'Network.loadingFailed') return handleLoadingFailed(source, params)
    if (method === 'Runtime.consoleAPICalled') return handleRuntimeConsoleApiCalled(source, params)
    if (method === 'Runtime.exceptionThrown') return handleRuntimeExceptionThrown(source, params)
  } catch (error) {
    await pushLog({ level: 'error', scope: 'debugger', message: error?.message || String(error), url: params?.request?.url || '' })
  }
})

chrome.debugger.onDetach.addListener(async (source, reason) => {
  if ((source.tabId && source.tabId === runtimeState.attachedTabId) || (source.targetId && runtimeState.attachedDebuggee?.targetId === source.targetId)) {
    runtimeState.attachedTabId = null
    runtimeState.attachedDebuggee = null
    runtimeState.requestRuleMap.clear()
    await pushLog({ level: 'warn', scope: 'debugger', message: `Detached: ${reason}` })
    await updateConnectionFromActiveTab()
    await broadcastConnectionState()
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ;(async () => {
    const type = message?.type
    switch (type) {
      case 'state:get':
        sendResponse(await getFullState())
        return
      case 'app:openFullApp': {
        const base = chrome.runtime.getURL('src/fullapp/fullapp.html')
        let url = base
        if (message.editRuleId) {
          url = `${base}?edit=${encodeURIComponent(message.editRuleId)}`
        } else if (message.draftRule) {
          url = `${base}?draft=${encodeURIComponent(message.draftRule)}`
        } else if (message.inspectUrl) {
          url = `${base}?page=network&filterUrl=${encodeURIComponent(message.inspectUrl)}`
        }
        const hasParam = Boolean(message.editRuleId || message.draftRule || message.inspectUrl)
        const tabs = await chrome.tabs.query({})
        const existing = tabs.find(tab => tab.url?.startsWith(base))
        if (existing) {
          const update = hasParam ? { active: true, url } : { active: true }
          await chrome.tabs.update(existing.id, update)
          if (existing.windowId != null) {
            await chrome.windows.update(existing.windowId, { focused: true }).catch(() => {})
          }
          sendResponse({ ok: true, tabId: existing.id })
        } else {
          const created = await chrome.tabs.create({ url })
          sendResponse({ ok: true, tabId: created?.id || null })
        }
        return
      }
      case 'settings:update':
        sendResponse({ settings: await updateSettings(message.payload || {}) })
        await maybeAutoAttach()
        await updateConnectionFromActiveTab()
        await broadcastConnectionState()
        return
      case 'debugger:attachActiveTab': {
        const targetTab = await resolveAttachTargetTab(message, sender)
        const tabId = targetTab?.id
        if (!tabId) throw new Error('attachNoActiveTab')
        const result = await attachToTab(tabId)
        const attachedRef = toTabRef(targetTab)
        if (attachedRef) {
          runtimeState.lastAttachableTab = attachedRef
          runtimeState.candidateTab = attachedRef
        }
        await updateConnectionFromActiveTab()
        await pushLog({ level: 'info', scope: 'debugger', message: `Attached to tab ${tabId} via ${result.attachedVia || 'tabId'}` })
        await broadcastConnectionState()
        sendResponse({ attachedTabId: tabId })
        return
      }
      case 'debugger:detach':
        await detachCurrentTab()
        await updateConnectionFromActiveTab()
        await broadcastConnectionState()
        sendResponse({ attachedTabId: null })
        return
      case 'tab:reload': {
        const tabId = runtimeState.attachedTabId || runtimeState.candidateTab?.id || runtimeState.lastAttachableTab?.id || sender?.tab?.id
        if (!tabId) throw new Error('reloadNoTab')
        await chrome.tabs.reload(tabId)
        sendResponse({ ok: true, reloadedTabId: tabId })
        return
      }
      case 'collections:create': {
        sendResponse({ collections: await saveCollection(message.payload || {}) })
        return
      }
      case 'collections:update': {
        sendResponse({ collections: await saveCollection(message.payload || {}) })
        return
      }
      case 'collections:delete': {
        sendResponse({ collections: await deleteCollection(message.collectionId) })
        return
      }
      case 'rules:create': {
        const rule = makeRule(message.payload || {}, (await getState()).settings.activeCollectionId)
        const errors = validateRule(rule)
        if (errors.length) throw new Error(errors[0])
        sendResponse({ rules: await saveRule(rule) })
        await maybeAutoReloadAfterRuleChange()
        return
      }
      case 'rules:update': {
        const rule = makeRule(message.payload || {}, (await getState()).settings.activeCollectionId)
        const errors = validateRule(rule)
        if (errors.length) throw new Error(errors[0])
        sendResponse({ rules: await saveRule(rule) })
        await maybeAutoReloadAfterRuleChange()
        return
      }
      case 'rules:toggle':
        sendResponse({ rules: await updateRuleEnabled(message.ruleId, message.enabled) })
        await maybeAutoReloadAfterRuleChange()
        return
      case 'rules:delete':
        sendResponse({ rules: await deleteRule(message.ruleId) })
        await maybeAutoReloadAfterRuleChange()
        return
      case 'rules:duplicate': {
        const state = await getState()
        const current = state.rules.find(rule => rule.id === message.ruleId)
        if (!current) {
          sendResponse({ rules: state.rules })
          return
        }
        const duplicated = clone(current)
        duplicated.id = uid('rule')
        duplicated.name = `${duplicated.name} copy`
        sendResponse({ rules: await saveRule(duplicated) })
        return
      }
      case 'rule:createFromRequest': {
        const entry = runtimeState.networkEntries.find(item => item.id === message.entryId)
        if (!entry) throw new Error('Network entry not found')

        let responseBody = ''
        try {
          const bodyResult = await sendAttachedCommand('Network.getResponseBody', { requestId: entry.networkId || entry.requestId })
          responseBody = bodyResult?.base64Encoded ? atob(bodyResult.body || '') : (bodyResult?.body || '')
        } catch {
          responseBody = '{\n  "ok": true\n}'
        }

        const state = await getState()
        const rule = makeRule({
          name: `${entry.method} ${new URL(entry.url).pathname}`,
          collectionId: state.settings.activeCollectionId,
          match: {
            urlPattern: new URL(entry.url).pathname,
            matchType: 'contains',
            method: entry.method || 'ANY',
            resourceType: 'ANY'
          },
          action: {
            type: 'mockResponse',
            statusCode: Number(entry.status || 200),
            statusText: entry.statusText || 'OK',
            contentType: entry.responseMimeType || 'application/json',
            applyResponseBody: true,
            applyResponseHeaders: false,
            responseBody: responseBody || '{\n  "ok": true\n}',
            responseHeaders: ''
          }
        }, state.settings.activeCollectionId)

        sendResponse({ rules: await saveRule(rule), createdRule: rule })
        return
      }
      case 'network:clear':
        sendResponse({ networkEntries: await clearNetworkEntries() })
        return
      case 'logs:clear':
        await setLogs([])
        sendResponse({ logs: [] })
        return
      default:
        sendResponse({ ok: true })
    }
  })().catch(async error => {
    await pushLog({ level: 'error', scope: 'runtime', message: `Message "${message?.type || 'unknown'}" failed: ${error?.message || String(error)}`, url: sender?.tab?.url || '' })
    sendResponse({ error: error?.message || String(error) })
  })

  return true
})
