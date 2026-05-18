export const runtimeState = {
  attachedTabId: null,
  attachedDebuggee: null,
  attachingTabId: null,
  activeTab: null,
  candidateTab: null,
  lastAttachableTab: null,
  fetchEnabled: false,
  networkEntries: [],
  networkIndex: new Map(),
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
  runtimeState.networkEntries = []
  runtimeState.networkIndex.clear()
  runtimeState.requestRuleMap.clear()
}
