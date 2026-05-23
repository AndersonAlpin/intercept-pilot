import { isHttpUrl } from './utils.js'

export function sameTabRef(left, right) {
  return Boolean(left?.id && right?.id && left.id === right.id)
}

export function isCapturableTabRef(tab) {
  return Boolean(tab?.id && isHttpUrl(tab?.url || ''))
}

export function getCapturedTab(state) {
  return state?.attachedTab || state?.compatActiveTab || null
}

export function getStartCandidateTab(state) {
  if (isCapturableTabRef(state?.candidateTab)) return state.candidateTab
  if (isCapturableTabRef(state?.lastAttachableTab)) return state.lastAttachableTab
  return null
}

export function getContextTab(state) {
  return getCapturedTab(state) || getStartCandidateTab(state)
}

export function getCaptureNewTabCandidate(state) {
  const captureTab = getCapturedTab(state)
  const candidateTab = isCapturableTabRef(state?.candidateTab) ? state.candidateTab : null
  if (!captureTab || !candidateTab) return null
  if (sameTabRef(candidateTab, captureTab)) return null
  if (candidateTab.id === state?.attachedTabId || candidateTab.id === state?.compatActiveTabId) return null
  if (state?.activeTab && !sameTabRef(candidateTab, state.activeTab)) return null
  return candidateTab
}
