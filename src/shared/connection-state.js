function hasOwnField(object, key) {
  return Object.prototype.hasOwnProperty.call(object || {}, key)
}

export function mergeConnectionState(current, patch) {
  return {
    attachedTabId: hasOwnField(patch, 'attachedTabId') ? patch.attachedTabId : (current.attachedTabId ?? null),
    attachedTab: hasOwnField(patch, 'attachedTab') ? patch.attachedTab : (current.attachedTab ?? null),
    compatActiveTab: hasOwnField(patch, 'compatActiveTab') ? patch.compatActiveTab : (current.compatActiveTab ?? null),
    activeTab: hasOwnField(patch, 'activeTab') ? patch.activeTab : (current.activeTab ?? null),
    candidateTab: hasOwnField(patch, 'candidateTab') ? patch.candidateTab : (current.candidateTab ?? null),
    lastAttachableTab: hasOwnField(patch, 'lastAttachableTab') ? patch.lastAttachableTab : (current.lastAttachableTab ?? null),
    compatActiveTabId: hasOwnField(patch, 'compatActiveTabId') ? patch.compatActiveTabId : (current.compatActiveTabId ?? null),
    networkMeta: hasOwnField(patch, 'networkMeta') ? patch.networkMeta : (current.networkMeta ?? null)
  }
}
