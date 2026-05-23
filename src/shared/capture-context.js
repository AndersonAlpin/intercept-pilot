export function getActiveCaptureTabId(state = {}) {
  const tabId = Number(state.attachedTabId || state.compatActiveTabId || 0)
  return tabId || null
}

export function hasActiveCaptureContext(state = {}) {
  return Boolean(getActiveCaptureTabId(state))
}

export function normalizeLogScope(scope) {
  return String(scope || '').toLowerCase() === 'web' ? 'web' : 'app'
}

function getEntryTabId(entry = {}) {
  const tabId = Number(entry.networkTabId || entry.tabId || entry.captureTabId || 0)
  return tabId || null
}

function getActiveCaptureSessionId(state = {}) {
  return state.networkMeta?.currentCaptureSessionId || null
}

export function belongsToActiveCapture(entry, state = {}) {
  const activeTabId = getActiveCaptureTabId(state)
  if (!activeTabId) return false
  if (getEntryTabId(entry) !== activeTabId) return false
  const activeSessionId = getActiveCaptureSessionId(state)
  if (!activeSessionId) return false
  return entry.captureSessionId === activeSessionId
}

export function getVisibleNetworkEntriesForCapture(state = {}, entries = state.networkEntries || []) {
  if (!hasActiveCaptureContext(state)) return []
  return entries.filter(entry => belongsToActiveCapture(entry, state))
}

export function getVisibleLogsForCapture(state = {}, logs = state.logs || []) {
  if (!hasActiveCaptureContext(state)) return []
  return logs.filter(log => normalizeLogScope(log.scope) === 'web' && belongsToActiveCapture(log, state))
}
