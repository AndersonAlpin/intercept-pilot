import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { getTooltipAttrs, renderTooltipAttrs } from '../../shared/ui/tooltip.js'
import { renderCheckbox } from '../../shared/ui/checkbox.js'
import { renderFloatingSelectionBar } from '../../shared/ui/floating-selection-bar.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderCollectionsPage(state) {
  const counts = new Map()
  const enabledCounts = new Map()
  for (const rule of state.rules) {
    counts.set(rule.collectionId, (counts.get(rule.collectionId) || 0) + 1)
    if (rule.enabled) enabledCounts.set(rule.collectionId, (enabledCounts.get(rule.collectionId) || 0) + 1)
  }
  const search = String(state.collectionsSearch || '').trim().toLowerCase()
  const collections = state.collections.filter(collection => {
    if (!search) return true
    const hay = `${displayCollectionName(collection)}`.toLowerCase()
    return hay.includes(search)
  })

  const header = `
    <div class="table-row row-collection rules-header" role="row">
      <div role="columnheader" class="col-select">
        ${renderCheckbox({ id: 'full-collections-select-all', data: { 'full-collections-select-all': true }, ariaLabel: t('common.selectAll') })}
      </div>
      <div role="columnheader">${escapeHtml(t('collections.title'))}</div>
      <div role="columnheader">${escapeHtml(t('collections.status'))}</div>
      <div role="columnheader">${escapeHtml(t('collections.primary'))}</div>
      <div role="columnheader">${escapeHtml(t('collections.enabledRules'))}</div>
      <div role="columnheader" class="col-actions data-panel__actions-cell">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `

  const filtersHtml = `
    <div class="toolbar">
      <input class="input filter-grow" id="full-collections-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('collections.title').toLowerCase())}" value="${escapeHtml(state.collectionsSearch || '')}" />
    </div>
  `
  const rowsHtml = collections.length ? collections.map(collection => `
    <div class="table-row row-collection">
      <div class="col-select">
        ${renderCheckbox({
          data: { 'full-collection-select': collection.id },
          disabled: collection.id === 'collection-default',
          ariaLabel: t('collections.selectCollection'),
          wrapperAttrs: collection.id === 'collection-default' ? getTooltipAttrs(t('collections.defaultCannotDelete')) : null
        })}
      </div>
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
          <input type="checkbox" data-full-collection-set-active="${collection.id}" ${state.settings?.activeCollectionId === collection.id ? 'checked' : ''} aria-label="${escapeHtml(t('collections.setPrimary'))}" />
          <span class="status-toggle-track" aria-hidden="true"></span>
        </label>
      </div>
      <div>${enabledCounts.get(collection.id) || 0}/${counts.get(collection.id) || 0}</div>
      <div class="row-actions col-actions data-panel__actions-cell">
        ${collection.id === 'collection-default' ? '' : `<button class="icon-btn" type="button" data-full-collection-rename="${collection.id}" ${renderTooltipAttrs(t('collections.rename'))} aria-label="${escapeHtml(t('collections.rename'))}">${icon('edit')}</button>`}
        <button class="icon-btn" type="button" data-full-collection-copy="${collection.id}" ${renderTooltipAttrs(t('common.copyJson'))} aria-label="${escapeHtml(t('common.copyJson'))}">${icon('copy')}</button>
        <button class="icon-btn" type="button" data-full-collection-export="${collection.id}" ${renderTooltipAttrs(t('common.exportJson'))} aria-label="${escapeHtml(t('common.exportJson'))}">${icon('download')}</button>
        ${collection.id === 'collection-default' ? '' : `<button class="icon-btn danger" type="button" data-full-collection-delete="${collection.id}" ${renderTooltipAttrs(t('common.delete'))} aria-label="${escapeHtml(t('common.delete'))}">${icon('trash')}</button>`}
      </div>
    </div>
  `).join('') : `<div class="empty">${escapeHtml(t('collections.noCollections'))}</div>`
  const bodyHtml = `
    <div class="data-table data-table--collections" role="table">
      ${collections.length ? `<div class="data-table__header table table-wide">${header}</div>` : ''}
      <div class="data-table__rows table table-wide">
        ${rowsHtml}
      </div>
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
        actionsHtml: `
          <button class="btn primary" id="full-new-collection-btn">${t('collections.newCollection')}</button>
        `,
        filtersHtml,
        bodyHtml,
        overlayHtml: renderFloatingSelectionBar({
          id: 'full-collections-selection-bar',
          label: `0 ${t('collections.entityMany')} ${t('common.selectedMany')}`,
          clearLabel: t('common.clear'),
          deleteLabel: t('common.delete'),
          clearId: 'full-clear-selected-collections-btn',
          deleteId: 'full-delete-selected-collections-btn'
        }),
        footerHtml: `<span class="data-panel__count">${escapeHtml(footerCount)}</span>`,
        className: 'collections-data-panel',
        scrollClassName: 'data-panel__scroll--table'
      })}
    </section>
  `
}
