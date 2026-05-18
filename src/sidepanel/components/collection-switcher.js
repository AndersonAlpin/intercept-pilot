import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderCollectionSwitcher(state) {
  const activeId = state.settings?.activeCollectionId || state.collections[0]?.id || ''
  const current = state.collections.find(item => item.id === activeId)
  const options = state.collections.map(collection => `<option value="${collection.id}" ${collection.id === activeId ? 'selected' : ''}>${escapeHtml(displayCollectionName(collection))}</option>`).join('')

  return `
    <div class="card compact-card">
      <div class="row space-between">
          <h2>${t('collections.title')}</h2>
          <button class="btn" id="manage-collections-btn">${t('common.manage')}</button>
      </div>
      <div class="column">
        <select class="select" id="active-collection-select">${options}</select>
        <div class="row space-between">
          <span class="small">${escapeHtml(t('rules.columns.status'))}</span>
          <label class="status-toggle" title="${escapeHtml(current?.enabled ? t('common.deactivate') : t('common.activate'))}">
            <input type="checkbox" id="active-collection-enabled" ${current?.enabled ? 'checked' : ''} aria-label="${escapeHtml(current?.enabled ? t('common.deactivate') : t('common.activate'))}" />
            <span class="status-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
      </div>
    </div>
  `
}
