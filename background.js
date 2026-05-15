const DEBUGGER_VERSION = '1.3'
const STORAGE_KEYS = {
  folders: 'folders',
  rules: 'rules',
  settings: 'settings',
  logs: 'logs'
}

const DEFAULT_FOLDER_ID = 'folder-default'
const MAX_LOGS = 300
const MAX_NETWORK_ENTRIES = 300

const state = {
  attachedTabId: null,
  attachedDebuggee: null,
  attachingTabId: null,
  fetchEnabled: false,
  networkEntries: [],
  networkIndex: new Map(),
  requestRuleMap: new Map(),
  tabMeta: new Map()
}

function getAttachedDebuggee() {
  if (state.attachedDebuggee) return state.attachedDebuggee
  if (state.attachedTabId) return { tabId: state.attachedTabId }
  return null
}

async function sendAttachedCommand(method, params = {}) {
  const debuggee = getAttachedDebuggee()
  if (!debuggee) throw new Error('Debugger is not attached')
  return chrome.debugger.sendCommand(debuggee, method, params)
}

function isAttachedSource(source) {
  if (!source) return false
  if (source.tabId && state.attachedTabId && source.tabId === state.attachedTabId) return true
  if (source.targetId && state.attachedDebuggee?.targetId && source.targetId === state.attachedDebuggee.targetId) return true
  return false
}

async function findPageTargetIdForTab(tabId) {
  const targets = await chrome.debugger.getTargets()
  const pageTarget = targets.find(target =>
    target &&
    target.tabId === tabId &&
    target.type === 'page' &&
    isAttachableUrl(target.url || '')
  )
  return pageTarget?.id || null
}

function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

async function storageGet(keys) {
  return chrome.storage.local.get(keys)
}

async function storageSet(value) {
  return chrome.storage.local.set(value)
}

async function ensureDefaults() {
  const stored = await storageGet(Object.values(STORAGE_KEYS))
  const folders = Array.isArray(stored.folders) && stored.folders.length
    ? stored.folders
    : [{ id: DEFAULT_FOLDER_ID, name: 'Default', enabled: true, order: 0 }]

  const rules = Array.isArray(stored.rules) ? stored.rules : []
  const settings = stored.settings || { autoAttach: false }
  const logs = Array.isArray(stored.logs) ? stored.logs : []

  await storageSet({ folders, rules, settings, logs })
}

async function getFolders() {
  const { folders = [] } = await storageGet([STORAGE_KEYS.folders])
  return folders
}

async function getRules() {
  const { rules = [] } = await storageGet([STORAGE_KEYS.rules])
  return rules
}

async function getLogs() {
  const { logs = [] } = await storageGet([STORAGE_KEYS.logs])
  return logs
}

async function pushLog(entry) {
  const logs = await getLogs()
  const next = [
    {
      id: uid('log'),
      timestamp: new Date().toISOString(),
      ...entry
    },
    ...logs
  ].slice(0, MAX_LOGS)

  await storageSet({ logs: next })
  broadcast({ type: 'state:logs', logs: next })
}

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {})
}

function encodeBody(body) {
  return btoa(unescape(encodeURIComponent(body)))
}

function normalizeHeaders(inputHeaders, contentType) {
  const output = []
  let hasContentType = false

  if (Array.isArray(inputHeaders)) {
    for (const header of inputHeaders) {
      if (!header || !header.name) continue
      if (header.name.toLowerCase() === 'content-type') hasContentType = true
      output.push({ name: String(header.name), value: String(header.value ?? '') })
    }
  }

  if (contentType && !hasContentType) {
    output.push({ name: 'Content-Type', value: contentType })
  }

  return output
}

function normalizeProtocolHeaders(inputHeaders) {
  if (!Array.isArray(inputHeaders)) return []
  return inputHeaders
    .filter(header => header && header.name)
    .map(header => ({
      name: String(header.name),
      value: String(header.value ?? '')
    }))
}

function headersObjectToArray(headersObj = {}) {
  if (!headersObj || typeof headersObj !== 'object') return []
  return Object.entries(headersObj).map(([name, value]) => ({
    name: String(name),
    value: Array.isArray(value) ? value.join(', ') : String(value ?? '')
  }))
}

function minimalResponseHeaders(headers = []) {
  const keep = new Set(['content-type', 'cache-control', 'pragma', 'expires'])
  return headers.filter(header => keep.has(String(header?.name || '').toLowerCase()))
}

function decodeProtocolBody(result) {
  const body = String(result?.body || '')
  if (!body) return ''
  if (!result?.base64Encoded) return body

  try {
    if (typeof atob === 'function') {
      const binary = atob(body)
      const bytes = Uint8Array.from(binary, ch => ch.charCodeAt(0))
      return new TextDecoder().decode(bytes)
    }
  } catch {}

  return body
}

function parseMaybeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function isAttachableUrl(url) {
  if (!url || typeof url !== 'string') return false
  return /^https?:\/\//i.test(url)
}

function isCrossExtensionAccessError(error) {
  const message = String(error?.message || error || '')
  return message.includes('Cannot access a chrome-extension:// URL of different extension')
}

async function getCrossExtensionFrameIds(tabId) {
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

async function removeCrossExtensionIframes(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) return 0

  try {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (ownExtensionId) => {
        const iframes = Array.from(document.querySelectorAll('iframe[src^="chrome-extension://"]'))
        let removedCount = 0

        for (const iframe of iframes) {
          const src = String(iframe.getAttribute('src') || '')
          const match = src.match(/^chrome-extension:\/\/([^/]+)\//i)
          if (!match?.[1]) continue
          if (match[1] === ownExtensionId) continue
          iframe.remove()
          removedCount += 1
        }

        return removedCount
      },
      args: [chrome.runtime.id]
    })

    return Number(result?.result || 0)
  } catch {
    return 0
  }
}

function buildAttachGuidance(error, tabUrl = '', extensionFrameIds = []) {
  if (!isCrossExtensionAccessError(error)) return error?.message || String(error)

  const offenders = extensionFrameIds.length
    ? ` Extensoes detectadas na aba: ${extensionFrameIds.join(', ')}.`
    : ' Nenhuma extensao especifica foi identificada via frame scan.'

  return [
    'Chrome bloqueou o attach porque a aba possui contexto de outra extensao (chrome-extension://).',
    'Desative temporariamente as extensoes listadas abaixo, recarregue a aba e tente Attach novamente.',
    offenders,
    tabUrl ? `Aba alvo: ${tabUrl}` : ''
  ].filter(Boolean).join(' ')
}

function safeRegex(pattern) {
  try {
    return new RegExp(pattern)
  } catch {
    return null
  }
}

function getCurrentUrl(tabId) {
  const meta = state.tabMeta.get(tabId)
  return meta?.url || ''
}

function matchesUrl(url, rule) {
  const pattern = rule?.match?.urlPattern || ''
  const matchType = rule?.match?.matchType || 'contains'

  if (!pattern) return false

  if (matchType === 'equals') return url === pattern
  if (matchType === 'regex') {
    const regex = safeRegex(pattern)
    return regex ? regex.test(url) : false
  }

  return url.includes(pattern)
}

function matchesMethod(method, rule) {
  const expected = rule?.match?.method
  if (!expected || expected === 'ANY') return true
  return String(method || '').toUpperCase() === String(expected).toUpperCase()
}

function matchesResourceType(resourceType, rule) {
  const expected = rule?.match?.resourceType
  if (!expected || expected === 'ANY') return true
  return String(resourceType || '').toLowerCase() === String(expected).toLowerCase()
}

function sortRules(rules) {
  return [...rules].sort((a, b) => {
    const aPriority = Number(a.priority || 0)
    const bPriority = Number(b.priority || 0)
    return bPriority - aPriority
  })
}

async function findMatchingRule(url, method, resourceType) {
  const [folders, rules] = await Promise.all([getFolders(), getRules()])
  const enabledFolders = new Set(folders.filter(folder => folder.enabled !== false).map(folder => folder.id))

  for (const rule of sortRules(rules)) {
    if (!rule.enabled) continue
    if (!enabledFolders.has(rule.folderId)) continue
    if (!matchesUrl(url, rule)) continue
    if (!matchesMethod(method, rule)) continue
    if (!matchesResourceType(resourceType, rule)) continue
    return rule
  }

  return null
}

function getEntryKey(params) {
  return params.networkId || params.requestId
}

function upsertNetworkEntry(key, patch) {
  const index = state.networkIndex.get(key)

  if (index === undefined) {
    const entry = {
      id: key,
      requestId: patch.requestId || key,
      networkId: patch.networkId || key,
      url: '',
      method: '',
      status: null,
      resourceType: '',
      startedAt: Date.now(),
      endedAt: null,
      durationMs: null,
      matchedRuleId: null,
      matchedRuleName: null,
      appliedAction: 'passThrough',
      intercepted: false,
      errorText: '',
      ...patch
    }

    state.networkEntries.unshift(entry)
    state.networkIndex.set(key, 0)

    if (state.networkEntries.length > MAX_NETWORK_ENTRIES) {
      state.networkEntries = state.networkEntries.slice(0, MAX_NETWORK_ENTRIES)
      rebuildNetworkIndex()
    } else {
      rebuildNetworkIndex()
    }
    return entry
  }

  const current = state.networkEntries[index]
  const next = { ...current, ...patch }
  if (next.startedAt && next.endedAt && next.durationMs == null) {
    next.durationMs = Math.max(0, next.endedAt - next.startedAt)
  }
  state.networkEntries[index] = next
  return next
}

function rebuildNetworkIndex() {
  state.networkIndex.clear()
  state.networkEntries.forEach((entry, index) => state.networkIndex.set(entry.id, index))
}

function publishNetwork() {
  broadcast({ type: 'state:network', networkEntries: state.networkEntries.slice(0, 200) })
}

async function applyRule(tabId, params, rule) {
  const requestKey = getEntryKey(params)
  const actionType = rule.actionType || 'passThrough'
  const action = rule.action || {}

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

  if (actionType === 'mockResponse') {
    const applyResponseHeaders = action.applyResponseHeaders !== false
    const applyResponseBody = action.applyResponseBody !== false

    if (!(applyResponseHeaders && applyResponseBody)) {
      await sendAttachedCommand('Fetch.continueRequest', {
        requestId: params.requestId
      })
      return
    }

    const responseBody = typeof action.responseBody === 'string'
      ? action.responseBody
      : JSON.stringify(action.responseBody || {})
    const headers = normalizeHeaders(action.responseHeaders, action.contentType || 'application/json')

    await sendAttachedCommand('Fetch.fulfillRequest', {
      requestId: params.requestId,
      responseCode: Number(action.statusCode || 200),
      responsePhrase: String(action.statusText || 'OK'),
      responseHeaders: headers,
      body: encodeBody(responseBody)
    })

    await pushLog({
      level: 'info',
      scope: 'rule',
      message: `Mock response applied: ${rule.name}`,
      url: params.request.url,
      method: params.request.method,
      ruleId: rule.id,
      ruleName: rule.name,
      actionType
    })
    return
  }

  if (actionType === 'failRequest') {
    await sendAttachedCommand('Fetch.failRequest', {
      requestId: params.requestId,
      errorReason: String(action.failReason || 'Failed')
    })

    await pushLog({
      level: 'warn',
      scope: 'rule',
      message: `Request failed by rule: ${rule.name}`,
      url: params.request.url,
      method: params.request.method,
      ruleId: rule.id,
      ruleName: rule.name,
      actionType
    })
    return
  }

  await sendAttachedCommand('Fetch.continueRequest', {
    requestId: params.requestId
  })
}

async function applyRuleAtResponseStage(params, rule) {
  const actionType = rule.actionType || 'passThrough'
  const action = rule.action || {}

  if (actionType !== 'mockResponse') {
    await sendAttachedCommand('Fetch.continueResponse', { requestId: params.requestId })
    return
  }

  const applyResponseHeaders = action.applyResponseHeaders !== false
  const applyResponseBody = action.applyResponseBody !== false

  if (!applyResponseHeaders && !applyResponseBody) {
    await sendAttachedCommand('Fetch.continueResponse', { requestId: params.requestId })
    return
  }

  const responseCode = applyResponseHeaders
    ? Number(action.statusCode || params.responseStatusCode || 200)
    : Number(params.responseStatusCode || 200)
  const responsePhrase = applyResponseHeaders
    ? String(action.statusText || params.responseStatusText || 'OK')
    : String(params.responseStatusText || 'OK')

  if (!applyResponseBody) {
    const headers = applyResponseHeaders
      ? normalizeHeaders(action.responseHeaders, action.contentType || '')
      : normalizeProtocolHeaders(params.responseHeaders)

    await sendAttachedCommand('Fetch.continueResponse', {
      requestId: params.requestId,
      responseCode,
      responsePhrase,
      responseHeaders: headers
    })
    return
  }

  const responseBody = typeof action.responseBody === 'string'
    ? action.responseBody
    : JSON.stringify(action.responseBody || {})

  const headers = applyResponseHeaders
    ? normalizeHeaders(action.responseHeaders, action.contentType || 'application/json')
    : normalizeProtocolHeaders(params.responseHeaders)

  await sendAttachedCommand('Fetch.fulfillRequest', {
    requestId: params.requestId,
    responseCode,
    responsePhrase,
    responseHeaders: headers,
    body: encodeBody(responseBody)
  })
}

async function handleRequestPaused(source, params) {
  if (!isAttachedSource(source)) return
  const tabId = source?.tabId || state.attachedTabId

  if (params.responseStatusCode) {
    const key = getEntryKey(params)
    const existingRule = state.requestRuleMap.get(key)

    if (existingRule) {
      await applyRuleAtResponseStage(params, existingRule)
      return
    }

    await sendAttachedCommand('Fetch.continueResponse', { requestId: params.requestId }).catch(async () => {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {})
    })
    return
  }

  const rule = await findMatchingRule(params.request.url, params.request.method, params.resourceType)

  if (!rule) {
    upsertNetworkEntry(getEntryKey(params), {
      id: getEntryKey(params),
      requestId: params.requestId,
      networkId: params.networkId,
      url: params.request.url,
      method: params.request.method,
      resourceType: params.resourceType,
      matchedRuleId: null,
      matchedRuleName: null,
      appliedAction: 'passThrough',
      intercepted: false
    })
    publishNetwork()

    await sendAttachedCommand('Fetch.continueRequest', {
      requestId: params.requestId
    })
    return
  }

  state.requestRuleMap.set(getEntryKey(params), rule)
  await applyRule(tabId, params, rule)
}

function handleNetworkRequestWillBeSent(source, params) {
  if (!isAttachedSource(source)) return

  const key = params.requestId
  upsertNetworkEntry(key, {
    id: key,
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
  const existingRule = state.requestRuleMap.get(key)

  upsertNetworkEntry(key, {
    status: params.response.status,
    statusText: params.response.statusText || '',
    responseHeaders: headersObjectToArray(params.response.headers || {}),
    responseMimeType: params.response.mimeType || '',
    resourceType: params.type,
    matchedRuleId: existingRule?.id || null,
    matchedRuleName: existingRule?.name || null,
    appliedAction: existingRule?.actionType || state.networkEntries[state.networkIndex.get(key)]?.appliedAction || 'passThrough'
  })
  publishNetwork()
}

function handleLoadingFinished(source, params) {
  if (!isAttachedSource(source)) return

  const key = params.requestId
  upsertNetworkEntry(key, {
    endedAt: Date.now()
  })
  publishNetwork()
}

function handleLoadingFailed(source, params) {
  if (!isAttachedSource(source)) return

  const key = params.requestId
  upsertNetworkEntry(key, {
    endedAt: Date.now(),
    status: 0,
    errorText: params.errorText || 'Failed'
  })
  publishNetwork()
}

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  try {
    if (method === 'Fetch.requestPaused') {
      await handleRequestPaused(source, params)
      return
    }

    if (method === 'Network.requestWillBeSent') {
      handleNetworkRequestWillBeSent(source, params)
      return
    }

    if (method === 'Network.responseReceived') {
      handleNetworkResponseReceived(source, params)
      return
    }

    if (method === 'Network.loadingFinished') {
      handleLoadingFinished(source, params)
      return
    }

    if (method === 'Network.loadingFailed') {
      handleLoadingFailed(source, params)
    }
  } catch (error) {
    await pushLog({
      level: 'error',
      scope: 'debugger',
      message: error?.message || String(error),
      url: params?.request?.url || ''
    })
  }
})

chrome.debugger.onDetach.addListener(async (source, reason) => {
  if (
    (source.tabId && source.tabId === state.attachedTabId) ||
    (source.targetId && state.attachedDebuggee?.targetId && source.targetId === state.attachedDebuggee.targetId)
  ) {
    state.attachedTabId = null
    state.attachedDebuggee = null
    state.requestRuleMap.clear()
    await pushLog({
      level: 'warn',
      scope: 'debugger',
      message: `Detached from tab ${source.tabId}: ${reason}`
    })
    broadcast({ type: 'state:attached', attachedTabId: null })
  }
})

async function attachToTab(tabId) {
  if (!tabId) throw new Error('No tab available to attach')
  if (state.attachedTabId === tabId) return { attachedTabId: tabId }
  if (state.attachingTabId === tabId) return { attachedTabId: state.attachedTabId }

  const tab = await chrome.tabs.get(tabId)
  if (!isAttachableUrl(tab?.url)) {
    throw new Error('Attach only works on regular http(s) tabs. Open your app tab, click the page, and try Attach again.')
  }

  if (state.attachedTabId && state.attachedTabId !== tabId) {
    await detachCurrentTab().catch(() => {})
  }

  state.attachingTabId = tabId
  try {
    let attachedVia = 'tabId'
    let attachedTargetId = null
    try {
      await chrome.debugger.attach({ tabId }, DEBUGGER_VERSION)
    } catch (initialAttachError) {
      if (!isCrossExtensionAccessError(initialAttachError)) throw initialAttachError

      const removedIframes = await removeCrossExtensionIframes(tabId)
      await pushLog({
        level: 'warn',
        scope: 'debugger',
        message: `Initial attach blocked by cross-extension context. Removed ${removedIframes} iframe(s) and retrying.`,
        url: tab.url || ''
      })

      try {
        await chrome.debugger.attach({ tabId }, DEBUGGER_VERSION)
      } catch (retryAttachError) {
        if (!isCrossExtensionAccessError(retryAttachError)) throw retryAttachError

        const targetId = await findPageTargetIdForTab(tabId)
        if (!targetId) throw retryAttachError
        await chrome.debugger.attach({ targetId }, DEBUGGER_VERSION)
        attachedVia = 'targetId'
        attachedTargetId = targetId
      }
    }

    state.attachedTabId = tabId
    state.attachedDebuggee = attachedVia === 'targetId' ? { targetId: attachedTargetId } : { tabId }
    state.networkEntries = []
    rebuildNetworkIndex()
    state.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })

    try {
      await sendAttachedCommand('Network.enable')
    } catch (networkError) {
      await pushLog({
        level: 'warn',
        scope: 'debugger',
        message: `Network capture unavailable on this tab: ${networkError?.message || String(networkError)}`,
        url: tab.url || ''
      })
    }

    try {
      await sendAttachedCommand('Fetch.enable', {
        patterns: [
          { urlPattern: 'http://*', requestStage: 'Request' },
          { urlPattern: 'https://*', requestStage: 'Request' },
          { urlPattern: 'http://*', requestStage: 'Response' },
          { urlPattern: 'https://*', requestStage: 'Response' }
        ]
      })
      state.fetchEnabled = true
    } catch (fetchError) {
      state.fetchEnabled = false
      await pushLog({
        level: 'warn',
        scope: 'debugger',
        message: `Fetch interception unavailable on this tab: ${fetchError?.message || String(fetchError)}`,
        url: tab.url || ''
      })
    }

    await pushLog({
      level: 'info',
      scope: 'debugger',
      message: `Attached to tab ${tabId} via ${attachedVia}`,
      url: tab.url || ''
    })

    broadcast({ type: 'state:attached', attachedTabId: tabId })
    publishNetwork()
    return { attachedTabId: tabId }
  } catch (error) {
    const extensionFrameIds = await getCrossExtensionFrameIds(tabId)
    const guidedMessage = buildAttachGuidance(error, tab.url || '', extensionFrameIds)
    await pushLog({
      level: 'error',
      scope: 'debugger',
      message: `Attach failed for tab ${tabId}: ${guidedMessage}`,
      url: tab.url || ''
    })
    throw new Error(guidedMessage)
  } finally {
    state.attachingTabId = null
  }
}

async function detachCurrentTab() {
  if (!state.attachedTabId) return { attachedTabId: null }

  const tabId = state.attachedTabId
  const debuggee = getAttachedDebuggee() || { tabId }
  await chrome.debugger.detach(debuggee).catch(() => {})
  state.attachedTabId = null
  state.attachedDebuggee = null
  state.fetchEnabled = false
  state.requestRuleMap.clear()

  await pushLog({
    level: 'info',
    scope: 'debugger',
    message: `Detached from tab ${tabId}`
  })

  broadcast({ type: 'state:attached', attachedTabId: null })
  return { attachedTabId: null }
}

async function getActiveTab() {
  const [activeCurrentWindow, activeLastFocusedWindow, allLastFocusedWindow] = await Promise.all([
    chrome.tabs.query({ active: true, currentWindow: true }),
    chrome.tabs.query({ active: true, lastFocusedWindow: true }),
    chrome.tabs.query({ lastFocusedWindow: true })
  ])

  const uniqueTabs = []
  const seen = new Set()
  for (const tab of [...activeCurrentWindow, ...activeLastFocusedWindow, ...allLastFocusedWindow]) {
    if (!tab?.id || seen.has(tab.id)) continue
    seen.add(tab.id)
    uniqueTabs.push(tab)
  }

  const activeAttachableTab = uniqueTabs.find(tab => tab.active && isAttachableUrl(tab.url))
  if (activeAttachableTab) return activeAttachableTab

  const attachableTab = uniqueTabs.find(tab => isAttachableUrl(tab.url))
  if (attachableTab) return attachableTab

  return uniqueTabs.find(tab => tab.active) || uniqueTabs[0] || null
}

async function getFullState() {
  const [folders, rules, logs, settings, activeTab] = await Promise.all([
    getFolders(),
    getRules(),
    getLogs(),
    storageGet([STORAGE_KEYS.settings]).then(result => result.settings || { autoAttach: false }),
    getActiveTab()
  ])

  return {
    folders,
    rules,
    logs,
    settings,
    networkEntries: state.networkEntries.slice(0, 200),
    attachedTabId: state.attachedTabId,
    activeTab: activeTab
      ? { id: activeTab.id, url: activeTab.url || '', title: activeTab.title || '' }
      : null
  }
}

async function createFolder(payload) {
  const folders = await getFolders()
  const folder = {
    id: uid('folder'),
    name: payload?.name?.trim() || 'New folder',
    enabled: payload?.enabled !== false,
    order: folders.length
  }
  const next = [...folders, folder]
  await storageSet({ folders: next })
  return next
}

async function updateFolder(payload) {
  const folders = await getFolders()
  const next = folders.map(folder => folder.id === payload.id ? { ...folder, ...payload } : folder)
  await storageSet({ folders: next })
  return next
}

async function deleteFolder(folderId) {
  const [folders, rules] = await Promise.all([getFolders(), getRules()])
  const nextFolders = folders.filter(folder => folder.id !== folderId)
  const nextRules = rules.map(rule => rule.folderId === folderId ? { ...rule, folderId: DEFAULT_FOLDER_ID } : rule)
  await storageSet({ folders: nextFolders.length ? nextFolders : [{ id: DEFAULT_FOLDER_ID, name: 'Default', enabled: true, order: 0 }], rules: nextRules })
  return { folders: await getFolders(), rules: nextRules }
}

function makeDefaultRule(payload) {
  return {
    id: uid('rule'),
    name: payload?.name?.trim() || 'New rule',
    enabled: payload?.enabled !== false,
    folderId: payload?.folderId || DEFAULT_FOLDER_ID,
    priority: Number(payload?.priority || 0),
    match: {
      urlPattern: payload?.match?.urlPattern || '',
      matchType: payload?.match?.matchType || 'contains',
      method: payload?.match?.method || 'ANY',
      resourceType: payload?.match?.resourceType || 'ANY'
    },
    actionType: payload?.actionType || 'mockResponse',
    action: {
      statusCode: Number(payload?.action?.statusCode || 200),
      statusText: payload?.action?.statusText || 'OK',
      contentType: payload?.action?.contentType || 'application/json',
      responseHeaders: Array.isArray(payload?.action?.responseHeaders) ? payload.action.responseHeaders : [],
      applyResponseHeaders: payload?.action?.applyResponseHeaders !== false,
      applyResponseBody: payload?.action?.applyResponseBody !== false,
      responseBody: typeof payload?.action?.responseBody === 'string'
        ? payload.action.responseBody
        : JSON.stringify(payload?.action?.responseBody || { ok: true }, null, 2),
      failReason: payload?.action?.failReason || 'Failed',
      delayMs: Number(payload?.action?.delayMs || 0)
    }
  }
}

async function createRule(payload) {
  const rules = await getRules()
  const rule = makeDefaultRule(payload)
  const next = [rule, ...rules]
  await storageSet({ rules: next })
  return { rules: next, rule }
}

async function updateRule(payload) {
  const rules = await getRules()
  const next = rules.map(rule => rule.id === payload.id ? { ...rule, ...payload } : rule)
  await storageSet({ rules: next })
  return next
}

async function deleteRule(ruleId) {
  const rules = await getRules()
  const next = rules.filter(rule => rule.id !== ruleId)
  await storageSet({ rules: next })
  return next
}

async function duplicateRule(ruleId) {
  const rules = await getRules()
  const current = rules.find(rule => rule.id === ruleId)
  if (!current) return rules
  const copy = clone(current)
  copy.id = uid('rule')
  copy.name = `${copy.name} copy`
  const next = [copy, ...rules]
  await storageSet({ rules: next })
  return next
}

async function clearLogs() {
  await storageSet({ logs: [] })
  return []
}

async function clearNetworkEntries() {
  state.networkEntries = []
  rebuildNetworkIndex()
  publishNetwork()
  return []
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureDefaults()
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (tab) state.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.title) {
    state.tabMeta.set(tabId, { url: changeInfo.url || tab.url || '', title: changeInfo.title || tab.title || '' })
  }
})

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ;(async () => {
    switch (message?.type) {
      case 'state:get': {
        sendResponse(await getFullState())
        return
      }
      case 'debugger:attachActiveTab': {
        const senderTabId = sender?.tab?.id
        if (senderTabId) {
          const senderTab = await chrome.tabs.get(senderTabId).catch(() => null)
          if (senderTab?.id && isAttachableUrl(senderTab.url)) {
            sendResponse(await attachToTab(senderTabId))
            return
          }
        }

        const activeTab = await getActiveTab()
        if (!activeTab?.id) throw new Error('No active tab found')
        sendResponse(await attachToTab(activeTab.id))
        return
      }
      case 'debugger:detach': {
        sendResponse(await detachCurrentTab())
        return
      }
      case 'folders:create': {
        sendResponse({ folders: await createFolder(message.payload) })
        return
      }
      case 'folders:update': {
        sendResponse({ folders: await updateFolder(message.payload) })
        return
      }
      case 'folders:delete': {
        sendResponse(await deleteFolder(message.folderId))
        return
      }
      case 'rules:create': {
        sendResponse(await createRule(message.payload))
        return
      }
      case 'rules:update': {
        sendResponse({ rules: await updateRule(message.payload) })
        return
      }
      case 'rules:delete': {
        sendResponse({ rules: await deleteRule(message.ruleId) })
        return
      }
      case 'rules:duplicate': {
        sendResponse({ rules: await duplicateRule(message.ruleId) })
        return
      }
      case 'logs:clear': {
        sendResponse({ logs: await clearLogs() })
        return
      }
      case 'network:clear': {
        sendResponse({ networkEntries: await clearNetworkEntries() })
        return
      }
      case 'rule:createFromRequest': {
        const entry = state.networkEntries.find(item => item.id === message.entryId)
        if (!entry) throw new Error('Network entry not found')
        let responseBody = ''
        try {
          const bodyResult = await sendAttachedCommand('Network.getResponseBody', { requestId: entry.requestId })
          responseBody = decodeProtocolBody(bodyResult)
        } catch {
          responseBody = ''
        }

        const responseHeaders = minimalResponseHeaders(Array.isArray(entry.responseHeaders) ? entry.responseHeaders : [])
        const contentTypeHeader = responseHeaders.find(header => String(header.name).toLowerCase() === 'content-type')?.value

        const created = await createRule({
          name: `${entry.method} ${new URL(entry.url).pathname}`,
          match: {
            urlPattern: entry.url,
            matchType: 'equals',
            method: entry.method,
            resourceType: entry.resourceType || 'ANY'
          },
          actionType: 'mockResponse',
          action: {
            statusCode: Number(entry.status || 200),
            statusText: entry.statusText || 'OK',
            contentType: contentTypeHeader || entry.responseMimeType || 'application/json',
            responseBody: responseBody || JSON.stringify({ mocked: true, source: entry.url }, null, 2),
            responseHeaders,
            applyResponseHeaders: true,
            applyResponseBody: true,
            delayMs: 0,
            failReason: 'Failed'
          }
        })
        sendResponse({
          rules: created.rules,
          createdRule: created.rule
        })
        return
      }
      default: {
        sendResponse({ ok: true })
      }
    }
  })().catch(error => {
    pushLog({
      level: 'error',
      scope: 'runtime',
      message: `Message "${message?.type || 'unknown'}" failed: ${error?.message || String(error)}`,
      url: sender?.tab?.url || ''
    }).catch(() => {})
    sendResponse({ error: error?.message || String(error) })
  })

  return true
})
