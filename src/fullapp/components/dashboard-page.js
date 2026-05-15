export function renderDashboardPage(state) {
  const enabledRules = state.rules.filter(rule => rule.enabled).length
  const matchedRecently = state.rules.filter(rule => Number(rule.diagnostics?.matchCount || 0) > 0).length
  const errors = state.rules.filter(rule => rule.diagnostics?.lastError).length
  const activeCollection = state.collections.find(collection => collection.id === state.settings?.activeCollectionId)

  return `
    <section class="grid cards4">
      <article class="card"><h3>Attached</h3><p>${state.attachedTabId ? 'Yes' : 'No'}</p></article>
      <article class="card"><h3>Enabled Rules</h3><p>${enabledRules}</p></article>
      <article class="card"><h3>Matched Recently</h3><p>${matchedRecently}</p></article>
      <article class="card"><h3>Errors</h3><p>${errors}</p></article>
    </section>
    <section class="card">
      <h3>Current context</h3>
      <p>Active collection: <strong>${activeCollection?.name || 'Default'}</strong></p>
      <p>Recent network entries: ${state.networkEntries.length}</p>
      <p>Recent logs: ${state.logs.length}</p>
    </section>
  `
}
