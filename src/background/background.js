import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants.js'
import { ensureState, getState, setState, saveCollection, replaceCollectionContents, deleteCollection, deleteCollections, saveRule, deleteRule, deleteRules, moveRulesToCollection, updateRuleEnabled, updateSettings, setLogs, getReleaseNotesState, markReleaseNotesSeen } from '../shared/storage.js'
import { validateRule } from '../shared/validators.js'
import { clone, isHttpUrl, tryPrettyJson, uid } from '../shared/utils.js'
import { makeRule } from '../shared/models.js'
import { attachToTab, clearPersistedAttachedSession, detachCurrentTab, ensureAttachedDomainsReady, ensureRehydrated, isAttachedSource, sendAttachedCommand } from './debugger.js'
import { runtimeState } from './runtime-state.js'
import { pushLog } from './logger.js'
import { detectSimpleConflicts, findMatchingRule, getExecutableRules } from './rule-engine.js'
import { resolveNetworkEntryResponseBody } from './network-entry-body.js'
import { normalizePerformanceEntries } from './performance-entries.js'

function broadcast(message) {
  chrome.runtime.sendMessage(message).catch(() => {})
}

async function notifyCompatModeChanged(captureMode) {
  const tabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] }).catch(() => [])
  await Promise.all(tabs.map(tab => (
    tab.id
      ? chrome.tabs.sendMessage(tab.id, { type: 'compat:modeChanged', captureMode }).catch(() => {})
      : Promise.resolve()
  )))
}

function getCompatActiveTabId(settings, preferredTabId = null) {
  if (!['auto', 'compat'].includes(settings?.captureMode)) return null
  const preferred = Number(preferredTabId || 0)
  if (preferred && runtimeState.compatFallbackTabIds.has(preferred)) return preferred
  const first = Array.from(runtimeState.compatFallbackTabIds)[0]
  return first || null
}

function isCompatActiveForTab(tabId, settings) {
  const id = Number(tabId || 0)
  return Boolean(id && getCompatActiveTabId(settings, id) === id)
}

async function injectCompatScripts(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) return
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    files: ['src/content/compat-bridge.js']
  }).catch(() => {})
  await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    world: 'MAIN',
    files: ['src/content/compat-main.js']
  }).catch(() => {})
}

async function enableCompatForTab(tabId) {
  if (!tabId) return
  runtimeState.compatFallbackTabIds.add(Number(tabId))
  startCaptureSession(Number(tabId), 'compat')
  await injectCompatScripts(tabId)
  await chrome.tabs.sendMessage(tabId, { type: 'compat:modeChanged', captureMode: 'compat' }).catch(() => {})
  await seedExistingNetworkEntries(tabId).catch(() => {})
}

async function disableCompatForTab(tabId) {
  if (!tabId) return
  runtimeState.compatFallbackTabIds.delete(Number(tabId))
  if (!runtimeState.attachedTabId && runtimeState.compatFallbackTabIds.size === 0) {
    runtimeState.currentCaptureSessionId = null
  }
  await chrome.tabs.sendMessage(tabId, { type: 'compat:modeChanged', captureMode: 'cdp' }).catch(() => {})
}

function clearCompatFallback(tabId) {
  if (tabId) runtimeState.compatFallbackTabIds.delete(Number(tabId))
  if (!runtimeState.attachedTabId && runtimeState.compatFallbackTabIds.size === 0) {
    runtimeState.currentCaptureSessionId = null
  }
}

function getAutoCompatFallbackNotice(error) {
  const code = String(error?.message || '')
  if (code === 'attachDebuggerBusy') return 'compatFallbackCdpBusy'
  if (code === 'attachCrossExtension' || code.startsWith('attachCrossExtension:')) return 'compatFallbackExtensionBlocked'
  return ''
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

function normalizeHeaderList(headers) {
  if (!Array.isArray(headers)) return []
  return headers
    .map(header => {
      const name = String(header?.name || '').trim()
      if (!name) return null
      return { name, value: String(header?.value ?? '') }
    })
    .filter(Boolean)
}

function truncateCompatBody(body, max = 64 * 1024) {
  if (body == null) return { body: null, truncated: false }
  const text = String(body)
  if (text.length <= max) return { body: text, truncated: false }
  return { body: text.slice(0, max), truncated: true }
}

function getHeaderValue(headers, name) {
  const target = String(name || '').toLowerCase()
  const found = normalizeHeaderList(headers).find(header => String(header.name || '').toLowerCase() === target)
  return found?.value || ''
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

function shouldIgnoreNetworkUrl(url) {
  const value = String(url || '').trim()
  if (!value) return false
  return value.startsWith(`chrome-extension://${chrome.runtime.id}/`)
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

function nextNetworkEntryId(baseKey) {
  runtimeState.networkEntrySeq += 1
  return `${Date.now()}-${runtimeState.networkEntrySeq}-${String(baseKey || 'request')}`
}

function resolveNetworkEntryId(rawKey, { create = false } = {}) {
  const key = String(rawKey || '')
  if (!key) return create ? nextNetworkEntryId('request') : null
  const existing = runtimeState.requestEntryMap.get(key)
  if (existing) return existing
  if (!create) return null
  const created = nextNetworkEntryId(key)
  runtimeState.requestEntryMap.set(key, created)
  return created
}

function releaseNetworkEntryId(rawKey) {
  const key = String(rawKey || '')
  if (!key) return
  runtimeState.requestEntryMap.delete(key)
}

function rebuildNetworkIndex() {
  runtimeState.networkIndex.clear()
  runtimeState.networkEntries.forEach((entry, index) => runtimeState.networkIndex.set(entry.id, index))
}

function clearNetworkEntryCollections() {
  runtimeState.networkEntries = []
  runtimeState.networkIndex.clear()
  runtimeState.requestEntryMap.clear()
  runtimeState.ignoredRequestIds.clear()
  runtimeState.requestRuleMap.clear()
}

function getNetworkCycleMeta() {
  return {
    currentCaptureSessionId: runtimeState.currentCaptureSessionId,
    currentNetworkCycleId: runtimeState.currentNetworkCycleId,
    currentNavigationStartedAt: runtimeState.currentNavigationStartedAt,
    networkTabId: runtimeState.networkTabId
  }
}

function startCaptureSession(tabId, mode = 'cdp') {
  if (!tabId) return null
  runtimeState.captureSessionSeq += 1
  runtimeState.currentCaptureSessionId = `${mode}:${tabId}:${Date.now()}:${runtimeState.captureSessionSeq}`
  return runtimeState.currentCaptureSessionId
}

function beginNetworkCycle(tabId, reason = 'navigation') {
  if (!tabId || tabId !== runtimeState.attachedTabId) return null
  if (runtimeState.networkCycleInProgressTabId === tabId) {
    return {
      id: runtimeState.currentNetworkCycleId,
      tabId,
      reason,
      startedAt: runtimeState.currentNavigationStartedAt
    }
  }
  runtimeState.networkCycleSeq += 1
  runtimeState.currentNetworkCycleId = `${tabId}-${Date.now()}-${runtimeState.networkCycleSeq}`
  runtimeState.currentNavigationStartedAt = new Date().toISOString()
  runtimeState.networkTabId = tabId
  runtimeState.networkCycleInProgressTabId = tabId
  clearNetworkEntryCollections()
  publishNetworkNow()
  return {
    id: runtimeState.currentNetworkCycleId,
    tabId,
    reason,
    startedAt: runtimeState.currentNavigationStartedAt
  }
}

function isMainDocumentRequest(params = {}) {
  return String(params?.type || '').toLowerCase() === 'document'
    && String(params?.requestId || '')
    && String(params?.requestId || '') === String(params?.loaderId || '')
}

function isHighValueNetworkEntry(entry) {
  const type = String(entry?.resourceType || '').toLowerCase()
  if (type === 'xhr' || type === 'fetch' || type === 'preflight') return true
  if (entry?.intercepted) return true
  if (entry?.matchedRuleId || entry?.matchedRuleName) return true
  return false
}

function trimNetworkEntries(max) {
  while (runtimeState.networkEntries.length > max) {
    let dropIndex = -1

    // Prefer dropping the oldest low-value request first.
    for (let i = runtimeState.networkEntries.length - 1; i >= 0; i -= 1) {
      const entry = runtimeState.networkEntries[i]
      if (!isHighValueNetworkEntry(entry)) {
        dropIndex = i
        break
      }
    }

    if (dropIndex === -1) {
      // Fallback: all entries are high-value, remove the oldest one.
      dropIndex = runtimeState.networkEntries.length - 1
    }

    const [removed] = runtimeState.networkEntries.splice(dropIndex, 1)
    if (removed?.requestId) releaseNetworkEntryId(removed.requestId)
    if (removed?.networkId) releaseNetworkEntryId(removed.networkId)
    runtimeState.requestRuleMap.delete(String(removed?.requestId || ''))
    runtimeState.requestRuleMap.delete(String(removed?.networkId || ''))
  }
}

function upsertNetworkEntry(key, patch) {
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
      requestHeaders: [],
      requestPostData: null,
      requestPostDataTruncated: false,
      errorType: '',
      timing: null,
      documentUrl: '',
      responseBody: null,
      responseBodyBase64Encoded: false,
      responseBodyTruncated: false,
      responseBodyLoaded: 'idle',
      captureSessionId: runtimeState.currentCaptureSessionId,
      networkCycleId: runtimeState.currentNetworkCycleId,
      networkTabId: runtimeState.networkTabId || runtimeState.attachedTabId,
      ...patch
    }
    runtimeState.networkEntries.unshift(entry)
    rebuildNetworkIndex()
    return entry
  }

  const current = runtimeState.networkEntries[index]
  const next = { ...current, ...patch }
  if (next.startedAt && next.endedAt) next.durationMs = Math.max(0, next.endedAt - next.startedAt)
  runtimeState.networkEntries[index] = next
  return next
}

function publishNetworkNow() {
  clearTimeout(runtimeState.networkPublishTimer)
  runtimeState.networkPublishTimer = null
  broadcast({ type: 'state:network', networkEntries: runtimeState.networkEntries, networkMeta: getNetworkCycleMeta() })
}

function scheduleNetworkPublish() {
  if (runtimeState.networkPublishTimer) return
  runtimeState.networkPublishTimer = setTimeout(publishNetworkNow, 100)
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

function hasActiveCapture() {
  return Boolean(runtimeState.attachedTabId || runtimeState.compatFallbackTabIds.size)
}

function getValidCandidateTab() {
  if (isAttachableTab(runtimeState.candidateTab)) return runtimeState.candidateTab
  return null
}

function getEffectiveCandidateTab() {
  const candidate = getValidCandidateTab()
  if (candidate) return candidate
  if (isAttachableTab(runtimeState.lastAttachableTab)) return runtimeState.lastAttachableTab
  return null
}

async function getAttachedTabRef() {
  if (!runtimeState.attachedTabId) return null
  const fromActive = runtimeState.activeTab?.id === runtimeState.attachedTabId ? runtimeState.activeTab : null
  if (fromActive) return fromActive
  const tab = await chrome.tabs.get(runtimeState.attachedTabId).catch(() => null)
  if (!tab) return null
  return toTabRef(tab)
}

async function getCompatTabRef(tabId) {
  if (!tabId) return null
  const fromActive = runtimeState.activeTab?.id === tabId ? runtimeState.activeTab : null
  if (fromActive) return fromActive
  const fromCandidate = runtimeState.candidateTab?.id === tabId ? runtimeState.candidateTab : null
  if (fromCandidate) return fromCandidate
  const fromLast = runtimeState.lastAttachableTab?.id === tabId ? runtimeState.lastAttachableTab : null
  if (fromLast) return fromLast
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  return toTabRef(tab)
}

async function updateConnectionFromActiveTab(options = {}) {
  const allowCandidateUpdate = options.allowCandidateUpdate !== false
  const activeTab = await getActiveTab().catch(() => null)
  const activeRef = toTabRef(activeTab)
  runtimeState.activeTab = activeRef
  if (!allowCandidateUpdate) {
    if (!isAttachableTab(runtimeState.candidateTab)) runtimeState.candidateTab = null
    if (!isAttachableTab(runtimeState.lastAttachableTab)) runtimeState.lastAttachableTab = null
    return
  }
  if (isAttachableTab(activeRef)) {
    runtimeState.candidateTab = activeRef
    runtimeState.lastAttachableTab = activeRef
  } else {
    if (!isAttachableTab(runtimeState.candidateTab) || runtimeState.candidateTab.id === activeRef?.id) {
      runtimeState.candidateTab = null
    }
    if (!isAttachableTab(runtimeState.lastAttachableTab)) {
      runtimeState.lastAttachableTab = null
    }
  }
}

async function broadcastConnectionState() {
  const attachedTab = await getAttachedTabRef()
  const state = await getState()
  const candidate = getValidCandidateTab()
  const effectiveCandidate = getEffectiveCandidateTab()
  const compatActiveTabId = getCompatActiveTabId(state.settings, effectiveCandidate?.id || runtimeState.activeTab?.id || null)
  const compatActiveTab = await getCompatTabRef(compatActiveTabId)
  broadcast({
    type: 'state:connection',
    attachedTabId: runtimeState.attachedTabId,
    attachedTab,
    compatActiveTab,
    activeTab: runtimeState.activeTab,
    candidateTab: candidate,
    lastAttachableTab: runtimeState.lastAttachableTab,
    compatActiveTabId,
    networkMeta: getNetworkCycleMeta()
  })
}

function ensureSeedNetworkCycle(tabId) {
  if (!tabId) return
  runtimeState.networkTabId = tabId
  if (!runtimeState.currentNetworkCycleId) {
    runtimeState.networkCycleSeq += 1
    runtimeState.currentNetworkCycleId = `seed:${tabId}:${Date.now()}:${runtimeState.networkCycleSeq}`
    runtimeState.currentNavigationStartedAt = new Date().toISOString()
  }
}

async function seedExistingNetworkEntries(tabId) {
  if (!tabId || !chrome.scripting?.executeScript) return []
  const [result] = await chrome.scripting.executeScript({
    target: { tabId, allFrames: false },
    world: 'MAIN',
    func: () => ({
      timeOrigin: performance.timeOrigin,
      documentUrl: location.href,
      entries: performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        startTime: entry.startTime,
        duration: entry.duration,
        transferSize: entry.transferSize,
        responseStatus: entry.responseStatus || 0
      }))
    })
  }).catch(() => [])

  const payload = result?.result
  const entries = normalizePerformanceEntries(payload?.entries || [], {
    tabId,
    now: Date.now(),
    timeOrigin: payload?.timeOrigin,
    documentUrl: payload?.documentUrl,
    captureSessionId: runtimeState.currentCaptureSessionId,
    networkCycleId: runtimeState.currentNetworkCycleId
  })
  if (!entries.length) return []

  ensureSeedNetworkCycle(tabId)
  for (const entry of entries.reverse()) {
    upsertNetworkEntry(entry.id, {
      ...entry,
      captureSessionId: runtimeState.currentCaptureSessionId,
      networkCycleId: runtimeState.currentNetworkCycleId
    })
  }
  scheduleNetworkPublish()
  return entries
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
  const releaseNotes = await getReleaseNotesState()
  await updateConnectionFromActiveTab({ allowCandidateUpdate: !hasActiveCapture() })
  const attachedTab = await getAttachedTabRef()
  const candidate = getValidCandidateTab()
  const effectiveCandidate = getEffectiveCandidateTab()
  const compatActiveTabId = getCompatActiveTabId(state.settings, effectiveCandidate?.id || runtimeState.activeTab?.id || null)
  const compatActiveTab = await getCompatTabRef(compatActiveTabId)

  const conflicts = detectSimpleConflicts(getExecutableRules(state.rules, state.collections, state.settings))
  const rules = state.rules.map(rule => {
    const live = runtimeState.hitCounters.get(rule.id)
    return {
      ...rule,
      diagnostics: {
        ...(rule.diagnostics || {}),
        ...(live
          ? {
              matchCount: live.count,
              lastMatchedAt: live.lastMatchedAt,
              lastError: live.lastError ?? rule.diagnostics?.lastError ?? ''
            }
          : {}),
        conflictIds: conflicts.get(rule.id) || []
      }
    }
  })

  return {
    collections: state.collections,
    rules,
    logs: state.logs,
    settings: state.settings || DEFAULT_SETTINGS,
    releaseNotes,
    networkEntries: runtimeState.networkEntries,
    networkMeta: getNetworkCycleMeta(),
    attachedTabId: runtimeState.attachedTabId,
    attachedTab,
    compatActiveTab,
    activeTab: runtimeState.activeTab,
    candidateTab: candidate,
    lastAttachableTab: runtimeState.lastAttachableTab,
    compatActiveTabId
  }
}

async function reloadTabWithReadyDebugger(tabId) {
  if (!tabId) throw new Error('reloadNoTab')
  const state = await getState()
  if (isCompatActiveForTab(tabId, state.settings)) {
    await chrome.tabs.reload(tabId)
    return { ok: true, reloadedTabId: tabId, captureMode: 'compat', networkMeta: getNetworkCycleMeta() }
  }
  await ensureAttachedDomainsReady(tabId)
  await chrome.tabs.reload(tabId)
  return { ok: true, reloadedTabId: tabId, networkMeta: getNetworkCycleMeta() }
}

async function maybeAutoAttach() {
  const state = await getState()
  if (state.settings?.captureMode === 'compat') return false
  if (state.settings?.captureMode === 'auto') return false
  if (!state.settings?.autoAttach) return false
  const targetId = runtimeState.candidateTab?.id || runtimeState.lastAttachableTab?.id
  if (!targetId) return false
  if (runtimeState.attachedTabId === targetId) return false
  if (runtimeState.attachingTabId === targetId) return false
  try {
    const previousAttachedTabId = runtimeState.attachedTabId
    const result = await attachToTab(targetId)
    await seedExistingNetworkEntries(targetId).catch(() => {})
    if (previousAttachedTabId !== targetId) {
      await resetMatchedStateForNewPageCycle(targetId)
    }
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
  await reloadTabWithReadyDebugger(targetId).catch(() => {})
  return true
}

async function syncNetworkSettingsFromState() {
  const state = await getState()
  const limit = Number(state?.settings?.maxNetworkEntries || 300)
  runtimeState.networkMaxEntries = Number.isFinite(limit) && limit > 0 ? limit : 300
}

function ensureHitCounter(rule) {
  let current = runtimeState.hitCounters.get(rule.id)
  if (!current) {
    current = {
      count: Number(rule.diagnostics?.matchCount || 0),
      lastMatchedAt: rule.diagnostics?.lastMatchedAt || null,
      lastError: rule.diagnostics?.lastError || '',
      dirty: false
    }
    runtimeState.hitCounters.set(rule.id, current)
  }
  return current
}

function scheduleHitFlush() {
  if (!runtimeState.hitFirstDirtyAt) runtimeState.hitFirstDirtyAt = Date.now()
  clearTimeout(runtimeState.hitFlushTimer)
  const elapsed = Date.now() - runtimeState.hitFirstDirtyAt
  const remaining = Math.max(0, 10000 - elapsed)
  const wait = Math.min(2000, remaining)
  runtimeState.hitFlushTimer = setTimeout(flushHits, wait)
}

async function flushHits() {
  runtimeState.hitFlushTimer = null
  runtimeState.hitFirstDirtyAt = null
  const state = await getState()
  let mutated = false
  const updatedRules = state.rules.map(rule => {
    const live = runtimeState.hitCounters.get(rule.id)
    if (!live || !live.dirty) return rule
    mutated = true
    return {
      ...rule,
      diagnostics: {
        ...(rule.diagnostics || {}),
        matchCount: live.count,
        lastMatchedAt: live.lastMatchedAt,
        lastError: live.lastError ?? rule.diagnostics?.lastError ?? ''
      }
    }
  })
  if (!mutated) return
  await setState({ ...state, rules: updatedRules })
  for (const v of runtimeState.hitCounters.values()) v.dirty = false
}

function recordHit(rule) {
  const current = ensureHitCounter(rule)
  current.count += 1
  current.lastMatchedAt = new Date().toISOString()
  current.dirty = true
  scheduleHitFlush()
  broadcast({
    type: 'state:hit',
    ruleId: rule.id,
    matchCount: current.count,
    lastMatchedAt: current.lastMatchedAt
  })
}

function recordRuleError(rule, message) {
  const current = ensureHitCounter(rule)
  current.lastError = String(message || 'Unknown error')
  current.dirty = true
  scheduleHitFlush()
}

function clearRuleError(rule) {
  const current = runtimeState.hitCounters.get(rule.id)
  if (!current || !current.lastError) return
  current.lastError = ''
  current.dirty = true
  scheduleHitFlush()
}

async function resetMatchedState() {
  const state = await getState()
  let changed = false
  let liveChanged = false
  const nextRules = state.rules.map(rule => {
    if (!rule.diagnostics?.lastMatchedAt) return rule
    changed = true
    return {
      ...rule,
      diagnostics: {
        ...(rule.diagnostics || {}),
        lastMatchedAt: null
      }
    }
  })

  for (const counter of runtimeState.hitCounters.values()) {
    if (counter.lastMatchedAt) {
      counter.lastMatchedAt = null
      counter.dirty = true
      liveChanged = true
    }
  }

  if (!changed && !liveChanged) return

  if (changed) await setState({ ...state, rules: nextRules })
  if (liveChanged) scheduleHitFlush()
  broadcast({ type: 'state:hit-reset' })
}

async function resetMatchedStateForNewPageCycle(tabId) {
  if (!runtimeState.attachedTabId || runtimeState.attachedTabId !== tabId) return
  await resetMatchedState()
}

async function applyRule(params, rule) {
  const action = rule.action || {}
  const actionType = action.type || 'mockResponse'

  const requestKey = resolveNetworkEntryId(getEntryKey(params), { create: true })
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
  scheduleNetworkPublish()

  if (actionType === 'delayOnly') {
    if (Number(action.delayMs || 0) > 0) {
      await new Promise(resolve => setTimeout(resolve, Number(action.delayMs)))
    }
    try {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
      recordHit(rule)
      clearRuleError(rule)
    } catch (err) {
      recordRuleError(rule, err?.message || 'CDP continueRequest failed')
    }
    return
  }

  if (actionType === 'failRequest') {
    try {
      await sendAttachedCommand('Fetch.failRequest', {
        requestId: params.requestId,
        errorReason: String(action.failReason || 'Failed')
      })
      recordHit(rule)
      clearRuleError(rule)
    } catch (err) {
      recordRuleError(rule, err?.message || 'CDP failRequest failed')
    }
    return
  }

  if (actionType === 'passThrough') {
    try {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
      recordHit(rule)
      clearRuleError(rule)
    } catch (err) {
      recordRuleError(rule, err?.message || 'CDP continueRequest failed')
    }
    return
  }

  const applyResponseHeaders = action.applyResponseHeaders === true
  const applyResponseBody = action.applyResponseBody !== false

  if (!applyResponseBody) {
    try {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
      recordHit(rule)
      clearRuleError(rule)
    } catch (err) {
      recordRuleError(rule, err?.message || 'CDP continueRequest failed')
    }
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

  try {
    await sendAttachedCommand('Fetch.fulfillRequest', {
      requestId: params.requestId,
      responseCode: Number(action.statusCode || 200),
      responsePhrase: String(action.statusText || 'OK'),
      responseHeaders: headers,
      body: encodeBody(action.responseBody || '{\n  "ok": true\n}')
    })
    recordHit(rule)
    clearRuleError(rule)
  } catch (err) {
    recordRuleError(rule, err?.message || 'CDP fulfillRequest failed')
  }
}

async function handleRequestPaused(source, params) {
  if (!isAttachedSource(source)) return
  if (shouldIgnoreNetworkUrl(params?.request?.url)) {
    await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {})
    return
  }
  const rawEntryKey = getEntryKey(params)
  const entryId = resolveNetworkEntryId(rawEntryKey, { create: true })

  if (params.responseStatusCode) {
    await sendAttachedCommand('Fetch.continueResponse', { requestId: params.requestId }).catch(async () => {
      await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId }).catch(() => {})
    })
    return
  }

  const state = await getState()
  const rule = findMatchingRule(state.rules, state.collections, state.settings, params.request.url, params.request.method, params.resourceType)

  if (!rule) {
    upsertNetworkEntry(entryId, {
      id: entryId,
      requestId: params.requestId,
      networkId: params.networkId,
      url: params.request.url,
      method: params.request.method,
      resourceType: params.resourceType,
      appliedAction: 'passThrough',
      intercepted: false
    })
    scheduleNetworkPublish()
    await sendAttachedCommand('Fetch.continueRequest', { requestId: params.requestId })
    return
  }

  runtimeState.requestRuleMap.set(String(params.requestId || ''), rule)
  runtimeState.requestRuleMap.set(String(params.networkId || ''), rule)
  await applyRule(params, rule)
}

function handleNetworkRequestWillBeSent(source, params) {
  if (!isAttachedSource(source)) return
  if (isMainDocumentRequest(params) && !runtimeState.currentNetworkCycleId) {
    beginNetworkCycle(source?.tabId || runtimeState.attachedTabId, 'document-request')
  }
  if (shouldIgnoreNetworkUrl(params?.request?.url)) {
    runtimeState.ignoredRequestIds.add(String(params.requestId || ''))
    return
  }
  const rawKey = params.requestId
  const previousEntryId = resolveNetworkEntryId(rawKey)
  if (previousEntryId) {
    const previousIndex = runtimeState.networkIndex.get(previousEntryId)
    const previousEntry = previousIndex != null ? runtimeState.networkEntries[previousIndex] : null
    if (previousEntry?.endedAt) releaseNetworkEntryId(rawKey)
  }
  const entryId = resolveNetworkEntryId(rawKey, { create: true })
  const MAX_POST = 64 * 1024
  const rawPost = params.request?.postData
  let trimmedPost = null
  let postTruncated = false
  if (typeof rawPost === 'string') {
    if (rawPost.length > MAX_POST) {
      trimmedPost = rawPost.slice(0, MAX_POST)
      postTruncated = true
    } else {
      trimmedPost = rawPost
    }
  }
  upsertNetworkEntry(entryId, {
    id: entryId,
    requestId: params.requestId,
    networkId: params.requestId,
    url: params.request?.url || '',
    method: params.request?.method || '',
    resourceType: params.type,
    startedAt: Date.now(),
    documentUrl: params.documentURL || '',
    requestHeaders: Object.entries(params.request?.headers || {})
      .map(([name, value]) => ({ name, value: String(value ?? '') })),
    requestPostData: trimmedPost,
    requestPostDataTruncated: postTruncated
  })
  scheduleNetworkPublish()
}

function handleNetworkRequestWillBeSentExtraInfo(source, params) {
  if (!isAttachedSource(source)) return
  if (runtimeState.ignoredRequestIds.has(String(params.requestId || ''))) return
  const key = resolveNetworkEntryId(params.requestId) || resolveNetworkEntryId(params.requestId, { create: true })
  const idx = runtimeState.networkIndex.get(key)
  if (idx == null) return
  const current = runtimeState.networkEntries[idx]
  const existing = new Map(
    (current.requestHeaders || []).map(h => [String(h.name).toLowerCase(), h])
  )
  for (const [name, value] of Object.entries(params.headers || {})) {
    existing.set(String(name).toLowerCase(), { name, value: String(value ?? '') })
  }
  upsertNetworkEntry(key, { requestHeaders: Array.from(existing.values()) })
}

function handleNetworkResponseReceived(source, params) {
  if (!isAttachedSource(source)) return
  if (runtimeState.ignoredRequestIds.has(String(params.requestId || ''))) return
  const key = resolveNetworkEntryId(params.requestId) || resolveNetworkEntryId(params.requestId, { create: true })
  const existingRule = runtimeState.requestRuleMap.get(String(params.requestId || '')) || runtimeState.requestRuleMap.get(String(params.networkId || ''))
  const response = params.response || {}
  upsertNetworkEntry(key, {
    status: response.status,
    statusText: response.statusText || '',
    responseHeaders: Object.entries(response.headers || {}).map(([name, value]) => ({ name, value: String(value) })),
    responseMimeType: response.mimeType || '',
    resourceType: params.type,
    matchedRuleId: existingRule?.id || null,
    matchedRuleName: existingRule?.name || null,
    appliedAction: existingRule?.action?.type || 'passThrough',
    timing: response.timing || null
  })
  scheduleNetworkPublish()
}

function handleNetworkResponseReceivedExtraInfo(source, params) {
  if (!isAttachedSource(source)) return
  if (runtimeState.ignoredRequestIds.has(String(params.requestId || ''))) return
  const key = resolveNetworkEntryId(params.requestId) || resolveNetworkEntryId(params.requestId, { create: true })
  const idx = runtimeState.networkIndex.get(key)
  if (idx == null) return
  const current = runtimeState.networkEntries[idx]
  const existing = new Map(
    (current.responseHeaders || []).map(h => [String(h.name).toLowerCase(), h])
  )
  for (const [name, value] of Object.entries(params.headers || {})) {
    existing.set(String(name).toLowerCase(), { name, value: String(value ?? '') })
  }
  upsertNetworkEntry(key, { responseHeaders: Array.from(existing.values()) })
}

function handleLoadingFinished(source, params) {
  if (!isAttachedSource(source)) return
  const requestId = String(params.requestId || '')
  if (runtimeState.ignoredRequestIds.has(requestId)) {
    runtimeState.ignoredRequestIds.delete(requestId)
    return
  }
  const key = resolveNetworkEntryId(params.requestId) || resolveNetworkEntryId(params.requestId, { create: true })
  upsertNetworkEntry(key, { endedAt: Date.now() })
  releaseNetworkEntryId(params.requestId)
  runtimeState.requestRuleMap.delete(String(params.requestId || ''))
  scheduleNetworkPublish()
}

function handleLoadingFailed(source, params) {
  if (!isAttachedSource(source)) return
  const requestId = String(params.requestId || '')
  if (runtimeState.ignoredRequestIds.has(requestId)) {
    runtimeState.ignoredRequestIds.delete(requestId)
    return
  }
  const key = resolveNetworkEntryId(params.requestId) || resolveNetworkEntryId(params.requestId, { create: true })
  upsertNetworkEntry(key, {
    endedAt: Date.now(),
    status: 0,
    errorText: params.errorText || 'Failed',
    errorType: String(params.type || '')
  })
  releaseNetworkEntryId(params.requestId)
  runtimeState.requestRuleMap.delete(String(params.requestId || ''))
  scheduleNetworkPublish()
}

async function handleNetworkGetBody(message) {
  const entry = runtimeState.networkEntries.find(e => e.id === message.entryId)
  if (!entry) return { error: 'entry_not_found' }
  if (entry.responseBodyLoaded === 'loaded') {
    return {
      body: entry.responseBody,
      base64Encoded: entry.responseBodyBase64Encoded,
      truncated: entry.responseBodyTruncated
    }
  }
  entry.responseBodyLoaded = 'loading'
  try {
    const responseBodyRequestId = entry.networkId || entry.requestId
    if (!responseBodyRequestId) throw new Error('body_unavailable')
    const result = await sendAttachedCommand('Network.getResponseBody', {
      requestId: responseBodyRequestId
    })
    const MAX = 256 * 1024
    let body = String(result?.body || '')
    let truncated = false
    if (body.length > MAX) {
      body = body.slice(0, MAX)
      truncated = true
    }
    entry.responseBody = body
    entry.responseBodyBase64Encoded = !!result?.base64Encoded
    entry.responseBodyTruncated = truncated
    entry.responseBodyLoaded = 'loaded'
    return { body, base64Encoded: !!result?.base64Encoded, truncated }
  } catch (err) {
    entry.responseBodyLoaded = 'error'
    return { error: err?.message || 'body_unavailable' }
  }
}

function getCompatEntryKey(tabId, compatRequestId) {
  return `compat:${tabId || 'tab'}:${String(compatRequestId || '')}`
}

function buildCompatDecision(rule) {
  if (!rule) return { action: 'passThrough' }
  const action = rule.action || {}
  const actionType = action.type || 'mockResponse'

  if (actionType === 'delayOnly') {
    return { action: 'delayOnly', delayMs: Number(action.delayMs || 0) }
  }

  if (actionType === 'failRequest') {
    return {
      action: 'failRequest',
      delayMs: Number(action.delayMs || 0),
      reason: String(action.failReason || 'Failed to fetch')
    }
  }

  if (actionType === 'passThrough') {
    return { action: 'passThrough' }
  }

  const applyResponseHeaders = action.applyResponseHeaders === true
  const headers = applyResponseHeaders ? parseHeaderLines(action.responseHeaders || '') : []
  const contentType = action.contentType || 'application/json'
  ensureResponseHeader(headers, 'content-type', contentType)

  return {
    action: 'mockResponse',
    statusCode: Number(action.statusCode || 200),
    statusText: String(action.statusText || 'OK'),
    headers,
    body: action.applyResponseBody === false ? '' : String(action.responseBody || ''),
    delayMs: Number(action.delayMs || 0)
  }
}

async function handleCompatFetchRequest(message, sender) {
  const tabId = sender?.tab?.id || null
  const state = await getState()
  if (!isCompatActiveForTab(tabId, state.settings)) {
    return { action: 'passThrough', disabled: true }
  }

  const payload = message.payload || {}
  const url = String(payload.url || '')
  if (!isHttpUrl(url)) return { action: 'passThrough', disabled: true }

  const compatRequestId = String(payload.compatRequestId || uid('compat-request'))
  const entryKey = getCompatEntryKey(tabId, compatRequestId)
  const entryId = resolveNetworkEntryId(entryKey, { create: true })
  const method = String(payload.method || 'GET').toUpperCase()
  const requestBody = truncateCompatBody(payload.body)
  const rule = findMatchingRule(state.rules, state.collections, state.settings, url, method, 'Fetch')
  const actionType = rule?.action?.type || 'passThrough'
  const decision = buildCompatDecision(rule)
  const isMockResponse = rule && decision.action === 'mockResponse'

  upsertNetworkEntry(entryId, {
    id: entryId,
    requestId: compatRequestId,
    networkId: entryKey,
    url,
    method,
    source: 'compat',
    resourceType: 'Fetch',
    startedAt: Number(payload.startedAt || Date.now()),
    documentUrl: String(payload.documentUrl || sender?.tab?.url || ''),
    requestHeaders: normalizeHeaderList(payload.headers),
    requestPostData: requestBody.body,
    requestPostDataTruncated: Boolean(requestBody.truncated || payload.bodyTruncated),
    matchedRuleId: rule?.id || null,
    matchedRuleName: rule?.name || null,
    appliedAction: actionType,
    intercepted: Boolean(rule),
    status: isMockResponse ? Number(decision.statusCode || 200) : null,
    statusText: isMockResponse ? String(decision.statusText || 'OK') : '',
    responseHeaders: isMockResponse ? normalizeHeaderList(decision.headers) : [],
    responseMimeType: isMockResponse ? getHeaderValue(decision.headers, 'content-type') : '',
    responseBodyLoaded: 'idle',
    networkTabId: tabId
  })
  scheduleNetworkPublish()

  if (rule) {
    recordHit(rule)
    clearRuleError(rule)
  }

  return {
    ...decision,
    compatRequestId,
    matchedRuleId: rule?.id || null,
    matchedRuleName: rule?.name || null
  }
}

async function handleCompatFetchComplete(message, sender) {
  const tabId = sender?.tab?.id || null
  const payload = message.payload || {}
  const compatRequestId = String(payload.compatRequestId || '')
  if (!compatRequestId) return { ok: false }
  const entryKey = getCompatEntryKey(tabId, compatRequestId)
  const entryId = resolveNetworkEntryId(entryKey)
  if (!entryId) return { ok: false }

  const responseBody = truncateCompatBody(payload.responseBody, 256 * 1024)
  const responseHeaders = normalizeHeaderList(payload.responseHeaders)
  const contentType = String(payload.responseMimeType || getHeaderValue(responseHeaders, 'content-type') || '')
  upsertNetworkEntry(entryId, {
    status: Number(payload.status ?? 0),
    statusText: String(payload.statusText || ''),
    responseHeaders,
    responseMimeType: contentType,
    responseBody: responseBody.body,
    responseBodyTruncated: Boolean(responseBody.truncated || payload.responseBodyTruncated),
    responseBodyLoaded: payload.responseBodyLoaded || (responseBody.body == null ? 'idle' : 'loaded'),
    responseBodyBase64Encoded: false,
    endedAt: Number(payload.endedAt || Date.now()),
    errorText: '',
    errorType: ''
  })
  releaseNetworkEntryId(entryKey)
  scheduleNetworkPublish()
  return { ok: true }
}

async function handleCompatFetchError(message, sender) {
  const tabId = sender?.tab?.id || null
  const payload = message.payload || {}
  const compatRequestId = String(payload.compatRequestId || '')
  if (!compatRequestId) return { ok: false }
  const entryKey = getCompatEntryKey(tabId, compatRequestId)
  const entryId = resolveNetworkEntryId(entryKey)
  if (!entryId) return { ok: false }

  upsertNetworkEntry(entryId, {
    status: Number(payload.status ?? 0),
    endedAt: Number(payload.endedAt || Date.now()),
    errorText: String(payload.errorText || 'Failed to fetch'),
    errorType: String(payload.errorType || 'Fetch'),
    responseBodyLoaded: 'error'
  })
  releaseNetworkEntryId(entryKey)
  scheduleNetworkPublish()
  return { ok: true }
}

async function handleCompatPageLog(message, sender) {
  const tabId = sender?.tab?.id || null
  const state = await getState()
  if (!isCompatActiveForTab(tabId, state.settings)) return { ok: false }

  const payload = message.payload || {}
  const text = truncateCompatBody(payload.message, 16 * 1024)
  const messageText = String(text.body || '').trim()
  if (!messageText) return { ok: false }

  await pushLog({
    level: normalizeBrowserLogLevel(payload.level),
    scope: 'web',
    tabId,
    captureSessionId: runtimeState.currentCaptureSessionId || null,
    networkCycleId: runtimeState.currentNetworkCycleId || null,
    message: messageText,
    url: String(payload.url || sender?.tab?.url || ''),
    source: String(payload.source || 'console'),
    lineNumber: payload.lineNumber || null,
    columnNumber: payload.columnNumber || null,
    stack: payload.stack ? String(payload.stack) : '',
    truncated: Boolean(text.truncated || payload.truncated)
  })
  return { ok: true }
}

async function clearNetworkEntries() {
  clearNetworkEntryCollections()
  publishNetworkNow()
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
    tabId: source?.tabId || runtimeState.attachedTabId || null,
    captureSessionId: runtimeState.currentCaptureSessionId || null,
    networkCycleId: runtimeState.currentNetworkCycleId || null,
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
    tabId: source?.tabId || runtimeState.attachedTabId || null,
    captureSessionId: runtimeState.currentCaptureSessionId || null,
    networkCycleId: runtimeState.currentNetworkCycleId || null,
    message: exceptionText,
    url
  })
}

function getLogEntryUrl(entry) {
  const stackFrame = entry?.stackTrace?.callFrames?.find(frame => frame?.url)
  return String(entry?.url || stackFrame?.url || '')
}

function normalizeBrowserLogLevel(level) {
  const normalized = String(level || '').toLowerCase()
  if (normalized === 'error') return 'error'
  if (normalized === 'warning' || normalized === 'warn') return 'warn'
  return 'info'
}

async function handleLogEntryAdded(source, params) {
  if (!isAttachedSource(source)) return
  const entry = params?.entry || {}
  const entrySource = String(entry.source || '').toLowerCase()
  if (entrySource === 'javascript') return
  const message = String(entry.text || '').trim()
  if (!message) return
  await pushLog({
    level: normalizeBrowserLogLevel(entry.level),
    scope: 'web',
    tabId: source?.tabId || runtimeState.attachedTabId || null,
    captureSessionId: runtimeState.currentCaptureSessionId || null,
    networkCycleId: runtimeState.currentNetworkCycleId || null,
    message,
    url: getLogEntryUrl(entry)
  })
}

chrome.runtime.onInstalled.addListener(async () => {
  await ensureState()
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
})

;(async () => {
  const rehydrated = await ensureRehydrated()
  await syncNetworkSettingsFromState()
  if (rehydrated) {
    await updateConnectionFromActiveTab()
    await broadcastConnectionState()
  }
})()

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId).catch(() => null)
  if (tab) runtimeState.tabMeta.set(tabId, { url: tab.url || '', title: tab.title || '' })
  await updateConnectionFromActiveTab()
  await maybeAutoAttach()
  await broadcastConnectionState()
})

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'loading') {
    beginNetworkCycle(tabId, 'tab-loading')
    await resetMatchedStateForNewPageCycle(tabId)
  }
  if (changeInfo.status === 'complete' && tabId === runtimeState.attachedTabId) {
    runtimeState.networkCycleInProgressTabId = null
  }
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
  await updateConnectionFromActiveTab({ allowCandidateUpdate: !hasActiveCapture() })
  await maybeAutoAttach()
  await broadcastConnectionState()
})

chrome.tabs.onRemoved.addListener(async tabId => {
  clearCompatFallback(tabId)
  if (runtimeState.candidateTab?.id === tabId) runtimeState.candidateTab = null
  if (runtimeState.lastAttachableTab?.id === tabId) runtimeState.lastAttachableTab = null
  if (runtimeState.activeTab?.id === tabId) runtimeState.activeTab = null
  await updateConnectionFromActiveTab()
  await maybeAutoAttach()
  await broadcastConnectionState()
})

async function refreshTabPositions() {
  await ensureRehydrated()
  await updateConnectionFromActiveTab({ allowCandidateUpdate: !hasActiveCapture() })
  await broadcastConnectionState()
}

chrome.tabs.onMoved.addListener(() => refreshTabPositions())
chrome.tabs.onDetached.addListener(() => refreshTabPositions())
chrome.tabs.onAttached.addListener(() => refreshTabPositions())

chrome.debugger.onEvent.addListener(async (source, method, params) => {
  await ensureRehydrated()
  try {
    if (method === 'Fetch.requestPaused') return handleRequestPaused(source, params)
    if (method === 'Network.requestWillBeSent') return handleNetworkRequestWillBeSent(source, params)
    if (method === 'Network.requestWillBeSentExtraInfo') return handleNetworkRequestWillBeSentExtraInfo(source, params)
    if (method === 'Network.responseReceived') return handleNetworkResponseReceived(source, params)
    if (method === 'Network.responseReceivedExtraInfo') return handleNetworkResponseReceivedExtraInfo(source, params)
    if (method === 'Network.loadingFinished') return handleLoadingFinished(source, params)
    if (method === 'Network.loadingFailed') return handleLoadingFailed(source, params)
    if (method === 'Runtime.consoleAPICalled') return handleRuntimeConsoleApiCalled(source, params)
    if (method === 'Runtime.exceptionThrown') return handleRuntimeExceptionThrown(source, params)
    if (method === 'Log.entryAdded') return handleLogEntryAdded(source, params)
  } catch (error) {
    await pushLog({ level: 'error', scope: 'debugger', message: error?.message || String(error), url: params?.request?.url || '' })
  }
})

chrome.debugger.onDetach.addListener(async (source, reason) => {
  await ensureRehydrated()
  if ((source.tabId && source.tabId === runtimeState.attachedTabId) || (source.targetId && runtimeState.attachedDebuggee?.targetId === source.targetId)) {
    runtimeState.attachedTabId = null
    runtimeState.attachedDebuggee = null
    runtimeState.fetchEnabled = false
    runtimeState.currentCaptureSessionId = null
    runtimeState.currentNetworkCycleId = null
    runtimeState.currentNavigationStartedAt = null
    runtimeState.networkCycleInProgressTabId = null
    runtimeState.debuggerDomainsReadyAt = null
    runtimeState.debuggerDomainsReadyForTabId = null
    runtimeState.requestRuleMap.clear()
    await clearPersistedAttachedSession()
    await flushHits().catch(() => {})
    await resetMatchedState()
    await pushLog({ level: 'warn', scope: 'debugger', message: `Detached: ${reason}` })
    await updateConnectionFromActiveTab()
    await broadcastConnectionState()
  }
})

if (chrome.runtime.onSuspend) {
  chrome.runtime.onSuspend.addListener(() => {
    flushHits().catch(() => {})
  })
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  ;(async () => {
    const type = message?.type
    if (!String(type || '').startsWith('compat:')) {
      await ensureRehydrated()
    }
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
        } else if (message.page) {
          url = `${base}?page=${encodeURIComponent(message.page)}`
        }
        const hasParam = Boolean(message.editRuleId || message.draftRule || message.inspectUrl || message.page)
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
        {
          const previous = (await getState()).settings
          const settings = await updateSettings(message.payload || {})
          sendResponse({ settings })
          if (previous.captureMode !== settings.captureMode) {
            runtimeState.compatFallbackTabIds.clear()
            if (!runtimeState.attachedTabId) runtimeState.currentCaptureSessionId = null
            await notifyCompatModeChanged('cdp')
            await pushLog({ level: 'info', scope: 'runtime', message: `Capture mode changed to ${settings.captureMode}` })
          }
          if (previous.activeCollectionId !== settings.activeCollectionId) {
            await resetMatchedState()
          }
        }
        await syncNetworkSettingsFromState()
        await maybeAutoAttach()
        await updateConnectionFromActiveTab()
        await broadcastConnectionState()
        return
      case 'releaseNotes:markSeen':
        sendResponse(await markReleaseNotesSeen(message.version || '', message.seenAt))
        return
      case 'debugger:attachActiveTab': {
        const targetTab = await resolveAttachTargetTab(message, sender)
        const tabId = targetTab?.id
        if (!tabId) throw new Error('attachNoActiveTab')
        const state = await getState()
        if (state.settings?.captureMode === 'compat') {
          const tabRef = toTabRef(targetTab)
          if (tabRef) {
            runtimeState.lastAttachableTab = tabRef
            runtimeState.candidateTab = tabRef
          }
          await enableCompatForTab(tabId)
          await resetMatchedState()
          await updateConnectionFromActiveTab()
          await pushLog({ level: 'info', scope: 'runtime', message: `Light capture enabled for tab ${tabId}` })
          await broadcastConnectionState()
          sendResponse({ attachedTabId: null, captureMode: 'compat' })
          return
        }
        const previousAttachedTabId = runtimeState.attachedTabId
        let result
        try {
          result = await attachToTab(tabId)
          clearCompatFallback(tabId)
        } catch (error) {
          const fallbackNotice = state.settings?.captureMode === 'auto' ? getAutoCompatFallbackNotice(error) : ''
          if (fallbackNotice) {
            const tabRef = toTabRef(targetTab)
            if (tabRef) {
              runtimeState.lastAttachableTab = tabRef
              runtimeState.candidateTab = tabRef
            }
            await enableCompatForTab(tabId)
            await resetMatchedState()
            await updateConnectionFromActiveTab()
            await pushLog({
              level: 'warn',
              scope: 'runtime',
              message: `Full capture could not attach on tab ${tabId}; using Light capture for fetch requests and basic page logs.`
            })
            await broadcastConnectionState()
            sendResponse({
              attachedTabId: null,
              captureMode: 'compat',
              fallbackFrom: 'cdp'
            })
            return
          }
          throw error
        }
        await seedExistingNetworkEntries(tabId).catch(() => {})
        // Reattach manual sempre inicia novo ciclo de validacao visual de "Acionada".
        if (previousAttachedTabId !== tabId) {
          await resetMatchedStateForNewPageCycle(tabId)
        } else {
          await resetMatchedState()
        }
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
        {
          const state = await getState()
          const explicitTabId = Number(message?.tabId || 0)
          const compatTabId = explicitTabId || getCompatActiveTabId(state.settings, runtimeState.candidateTab?.id || runtimeState.activeTab?.id || null)
          if (!runtimeState.attachedTabId && compatTabId) {
            await disableCompatForTab(compatTabId)
            await resetMatchedState()
            await updateConnectionFromActiveTab()
            await broadcastConnectionState()
            await pushLog({ level: 'info', scope: 'runtime', message: `Light capture stopped for tab ${compatTabId}` })
            sendResponse({ attachedTabId: null, captureMode: state.settings?.captureMode || 'auto' })
            return
          }
        }
        await detachCurrentTab()
        await resetMatchedState()
        await updateConnectionFromActiveTab()
        await broadcastConnectionState()
        sendResponse({ attachedTabId: null })
        return
      case 'tab:reload': {
        const state = await getState()
        const tabId = runtimeState.attachedTabId
          || getCompatActiveTabId(state.settings, runtimeState.candidateTab?.id || runtimeState.activeTab?.id || null)
          || runtimeState.candidateTab?.id
          || runtimeState.lastAttachableTab?.id
          || sender?.tab?.id
        if (!tabId) throw new Error('reloadNoTab')
        sendResponse(await reloadTabWithReadyDebugger(tabId))
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
      case 'collections:replaceContents': {
        sendResponse(await replaceCollectionContents(message.payload || {}, message.rules || []))
        await maybeAutoReloadAfterRuleChange()
        return
      }
      case 'collections:delete': {
        sendResponse({ collections: await deleteCollection(message.collectionId) })
        return
      }
      case 'collections:deleteMany': {
        sendResponse({ collections: await deleteCollections(message.collectionIds || []) })
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
      case 'rules:deleteMany':
        sendResponse({ rules: await deleteRules(message.ruleIds || []) })
        await maybeAutoReloadAfterRuleChange()
        return
      case 'rules:move':
        sendResponse({ rules: await moveRulesToCollection(message.ruleIds || [], message.collectionId) })
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

        const bodyResult = await resolveNetworkEntryResponseBody(entry, {
          getEntry: () => runtimeState.networkEntries.find(item => item.id === message.entryId),
          fetchBody: requestId => sendAttachedCommand('Network.getResponseBody', { requestId })
        })
        const responseBody = bodyResult.body
        const prettyResponseBody = tryPrettyJson(responseBody).pretty || '{\n  "ok": true\n}'

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
            responseBody: prettyResponseBody,
            responseHeaders: ''
          }
        }, state.settings.activeCollectionId)

        sendResponse({ rules: await saveRule(rule), createdRule: rule })
        return
      }
      case 'network:clear':
        sendResponse({ networkEntries: await clearNetworkEntries() })
        return
      case 'network:getBody':
        sendResponse(await handleNetworkGetBody(message))
        return
      case 'compat:getMode': {
        const state = await getState()
        const tabId = sender?.tab?.id || null
        sendResponse({
          captureMode: isCompatActiveForTab(tabId, state.settings) ? 'compat' : 'cdp'
        })
        return
      }
      case 'compat:fetchRequest':
        sendResponse(await handleCompatFetchRequest(message, sender))
        return
      case 'compat:fetchComplete':
        sendResponse(await handleCompatFetchComplete(message, sender))
        return
      case 'compat:fetchError':
        sendResponse(await handleCompatFetchError(message, sender))
        return
      case 'compat:pageLog':
        sendResponse(await handleCompatPageLog(message, sender))
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
