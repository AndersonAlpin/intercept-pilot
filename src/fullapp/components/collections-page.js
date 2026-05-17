import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'

export function renderCollectionsPage(state) {
  const counts = new Map()
  for (const rule of state.rules) counts.set(rule.collectionId, (counts.get(rule.collectionId) || 0) + 1)
  const search = String(state.collectionsSearch || '').trim().toLowerCase()
  const collections = state.collections.filter(collection => {
    if (!search) return true
    const hay = `${collection.name || ''}`.toLowerCase()
    return hay.includes(search)
  })

  const header = `
    <div class="table-row row-collection rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('collections.title'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.status'))}</div>
      <div role="columnheader">${escapeHtml(t('collections.active'))}</div>
      <div role="columnheader">RULES</div>
      <div role="columnheader" class="col-actions">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `

  return `
    <section class="split-page collections-page">
      <section class="card filters-card collections-filters-card">
        <div class="toolbar">
          <input class="input" id="full-collections-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('collections.title').toLowerCase())}" value="${escapeHtml(state.collectionsSearch || '')}" />
          <button class="btn primary" id="full-new-collection-btn">${t('collections.newCollection')}</button>
        </div>
      </section>
      <section class="card data-card collections-data-card">
        <div class="table table-wide">
          ${collections.length ? header : ''}
          ${collections.length ? collections.map(collection => `
            <div class="table-row row-collection">
              <div class="cell-rule">
                <strong>${escapeHtml(collection.name)}</strong>
                <span class="cell-rule-url">${counts.get(collection.id) || 0} ${t('collections.rulesCount')}</span>
              </div>
              <div>
                <label class="status-toggle">
                  <input type="checkbox" data-full-collection-enable="${collection.id}" ${collection.enabled ? 'checked' : ''} aria-label="${escapeHtml(t('common.enabled'))}" />
                  <span class="status-toggle-track" aria-hidden="true"></span>
                </label>
              </div>
              <div>
                <label class="status-toggle">
                  <input type="checkbox" data-full-collection-set-active="${collection.id}" ${state.settings?.activeCollectionId === collection.id ? 'checked' : ''} aria-label="${escapeHtml(t('collections.setActive'))}" />
                  <span class="status-toggle-track" aria-hidden="true"></span>
                </label>
              </div>
              <div>${counts.get(collection.id) || 0}</div>
              <div class="row-actions col-actions">
                <button class="icon-btn" type="button" data-full-collection-rename="${collection.id}" title="${escapeHtml(t('collections.rename'))}" aria-label="${escapeHtml(t('collections.rename'))}">${icon('edit')}</button>
                <button class="icon-btn" type="button" data-full-collection-copy="${collection.id}" title="${escapeHtml(t('common.copyJson'))}" aria-label="${escapeHtml(t('common.copyJson'))}">${icon('copy')}</button>
                <button class="icon-btn" type="button" data-full-collection-export="${collection.id}" title="${escapeHtml(t('common.exportJson'))}" aria-label="${escapeHtml(t('common.exportJson'))}">${icon('download')}</button>
                ${collection.id === 'collection-default' ? '' : `<button class="icon-btn danger" type="button" data-full-collection-delete="${collection.id}" title="${escapeHtml(t('common.delete'))}" aria-label="${escapeHtml(t('common.delete'))}">${icon('trash')}</button>`}
              </div>
            </div>
          `).join('') : `<div class="empty">${escapeHtml(t('collections.noCollections'))}</div>`}
        </div>
      </section>
    </section>
  `
}
