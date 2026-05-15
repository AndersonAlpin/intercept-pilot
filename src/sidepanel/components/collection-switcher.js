import { escapeHtml } from '../../shared/utils.js'

export function renderCollectionSwitcher(state) {
  const activeId = state.settings?.activeCollectionId || state.collections[0]?.id || ''
  const current = state.collections.find(item => item.id === activeId)
  const options = state.collections.map(collection => `<option value="${collection.id}" ${collection.id === activeId ? 'selected' : ''}>${escapeHtml(collection.name)}</option>`).join('')

  return `
    <div class="card compact-card">
      <div class="row space-between">
        <h2>Collection</h2>
        <button class="btn" id="manage-collections-btn">Manage</button>
      </div>
      <div class="column">
        <select class="select" id="active-collection-select">${options}</select>
        <label class="switch"><input type="checkbox" id="active-collection-enabled" ${current?.enabled ? 'checked' : ''}/> enabled</label>
      </div>
    </div>
  `
}
