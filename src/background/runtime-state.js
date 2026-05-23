export const runtimeState = {
  attachedTabId: null,
  attachedDebuggee: null,
  attachingTabId: null,
  activeTab: null,
  candidateTab: null,
  lastAttachableTab: null,
  compatFallbackTabIds: new Set(),
  fetchEnabled: false,
  networkTabId: null,
  networkMaxEntries: 300,
  networkCycleSeq: 0,
  currentNetworkCycleId: null,
  currentNavigationStartedAt: null,
  networkCycleInProgressTabId: null,
  networkEntrySeq: 0,
  networkEntries: [],
  networkIndex: new Map(),
  networkPublishTimer: null,
  debuggerDomainsReadyAt: null,
  debuggerDomainsReadyForTabId: null,
  requestEntryMap: new Map(),
  ignoredRequestIds: new Set(),
  requestRuleMap: new Map(),
  tabMeta: new Map(),
  hitCounters: new Map(),
  hitFlushTimer: null,
  hitFirstDirtyAt: null
}

export function getAttachedDebuggee() {
  if (runtimeState.attachedDebuggee) return runtimeState.attachedDebuggee
  if (runtimeState.attachedTabId) return { tabId: runtimeState.attachedTabId }
  return null
}

export function resetRuntimeCollections() {
  runtimeState.currentNetworkCycleId = null
  runtimeState.currentNavigationStartedAt = null
  runtimeState.networkCycleInProgressTabId = null
  runtimeState.networkEntries = []
  runtimeState.networkIndex.clear()
  runtimeState.requestEntryMap.clear()
  runtimeState.ignoredRequestIds.clear()
  runtimeState.requestRuleMap.clear()
}
