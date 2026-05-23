import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderSelect } from '../../shared/ui/select.js'
import { renderStatusToggle } from '../../shared/ui/toggle.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderCollectionSwitcher(state) {
  const activeId = state.settings?.activeCollectionId || state.collections[0]?.id || ''
  const current = state.collections.find(item => item.id === activeId)
  const options = state.collections.map(collection => ({ value: collection.id, label: displayCollectionName(collection) }))
  const statusLabel = current?.enabled ? t('common.deactivate') : t('common.activate')

  return `
    <div class="card compact-card">
      <div class="row space-between">
          <h2>${t('collections.title')}</h2>
          <button class="btn" id="manage-collections-btn">${t('common.manage')}</button>
      </div>
      <div class="column">
        ${renderSelect({ id: 'active-collection-select', value: activeId, options })}
        <div class="row space-between">
          <span class="small">${escapeHtml(t('rules.columns.status'))}</span>
          ${renderStatusToggle({ id: 'active-collection-enabled', checked: current?.enabled, title: statusLabel, ariaLabel: statusLabel })}
        </div>
      </div>
    </div>
  `
}
