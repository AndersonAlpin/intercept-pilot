import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderCollectionsPage(state) {
  const counts = new Map()
  for (const rule of state.rules) counts.set(rule.collectionId, (counts.get(rule.collectionId) || 0) + 1)
  const search = String(state.collectionsSearch || '').trim().toLowerCase()
  const collections = state.collections.filter(collection => {
    if (!search) return true
    const hay = `${displayCollectionName(collection)}`.toLowerCase()
    return hay.includes(search)
  })

  const header = `
    <div class="table-row row-collection rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('collections.title'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.status'))}</div>
      <div role="columnheader">${escapeHtml(t('collections.active'))}</div>
      <div role="columnheader">RULES</div>
      <div role="columnheader" class="col-actions data-panel__actions-cell">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `

  const filtersHtml = `
    <div class="toolbar">
      <input class="input filter-grow" id="full-collections-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('collections.title').toLowerCase())}" value="${escapeHtml(state.collectionsSearch || '')}" />
    </div>
  `
  const bodyHtml = `
    <div class="table table-wide">
          ${collections.length ? header : ''}
          ${collections.length ? collections.map(collection => `
            <div class="table-row row-collection">
              <div class="cell-rule">
                <strong>${escapeHtml(displayCollectionName(collection))}</strong>
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
              <div class="row-actions col-actions data-panel__actions-cell">
                <button class="icon-btn" type="button" data-full-collection-rename="${collection.id}" title="${escapeHtml(t('collections.rename'))}" aria-label="${escapeHtml(t('collections.rename'))}">${icon('edit')}</button>
                <button class="icon-btn" type="button" data-full-collection-copy="${collection.id}" title="${escapeHtml(t('common.copyJson'))}" aria-label="${escapeHtml(t('common.copyJson'))}">${icon('copy')}</button>
                <button class="icon-btn" type="button" data-full-collection-export="${collection.id}" title="${escapeHtml(t('common.exportJson'))}" aria-label="${escapeHtml(t('common.exportJson'))}">${icon('download')}</button>
                ${collection.id === 'collection-default' ? '' : `<button class="icon-btn danger" type="button" data-full-collection-delete="${collection.id}" title="${escapeHtml(t('common.delete'))}" aria-label="${escapeHtml(t('common.delete'))}">${icon('trash')}</button>`}
              </div>
            </div>
          `).join('') : `<div class="empty">${escapeHtml(t('collections.noCollections'))}</div>`}
    </div>
  `
  const footerCount = formatShowingCount({
    shown: collections.length,
    total: state.collections.length,
    singular: t('collections.entityOne'),
    plural: t('collections.entityMany')
  })

  return `
    <section class="split-page collections-page">
      ${renderDataPanel({
        title: t('collections.title'),
        actionsHtml: `<button class="btn primary" id="full-new-collection-btn">${t('collections.newCollection')}</button>`,
        filtersHtml,
        bodyHtml,
        footerHtml: `<span class="data-panel__count">${escapeHtml(footerCount)}</span>`,
        className: 'collections-data-panel'
      })}
    </section>
  `
}
