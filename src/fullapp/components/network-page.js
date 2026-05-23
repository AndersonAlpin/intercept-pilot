import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
import { renderPagination } from '../../shared/ui/pagination.js'

function hasActiveFilter(state) {
  const f = state.networkFilter
  return Boolean(f.url || f.method !== 'ANY' || f.status || f.interceptedOnly)
}

export function isRenderableNetworkEntry(entry) {
  const method = String(entry?.method || '').trim()
  const url = String(entry?.url || '').trim()
  return Boolean(method || url)
}

function getAppliedRuleLabel(entry) {
  return entry?.matchedRuleName ? entry.matchedRuleName : t('network.noRule')
}

function getResultLabel(entry) {
  const action = String(entry?.appliedAction || 'passThrough')
  if (action === 'mockResponse') return t('network.resultMock200', { status: String(entry?.status || 200) })
  if (action === 'delayOnly') return t('network.resultDelay')
  if (action === 'failRequest') return t('network.resultFail')
  return t('network.resultPassThrough')
}

function getNetworkPaginationSummary(state) {
  const total = state.networkEntries.filter(isRenderableNetworkEntry).length
  const filtered = state.filteredNetworkEntries?.length ?? total
  const pageSize = Number(state.networkPagination?.pageSize || 100)
  const page = Number(state.networkPagination?.page || 1)
  const start = filtered ? ((page - 1) * pageSize) + 1 : 0
  const end = Math.min(filtered, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(filtered / pageSize))
  const countText = filtered
    ? t('network.pageCount', { start, end, filtered, total })
    : t('network.resultsCount', { filtered, total })
  return { total, filtered, pageSize, page, totalPages, countText }
}

export function renderNetworkRows(state) {
  const entries = (state.pagedNetworkEntries || state.filteredNetworkEntries || state.networkEntries).filter(isRenderableNetworkEntry)
  if (!entries.length) {
    const lightCapture = state.settings?.captureMode === 'compat' || Boolean(state.compatActiveTabId)
    const key = hasActiveFilter(state) ? 'network.noResults' : 'network.noRequests'
    return renderEmptyState({
      message: t(key),
      helper: lightCapture ? t('network.lightCaptureHelper') : ''
    })
  }
  const header = `
    <div class="table-row row-network rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('common.method'))}</div>
      <div role="columnheader">URL</div>
      <div role="columnheader">${escapeHtml(t('common.status'))}</div>
      <div role="columnheader">TYPE</div>
      <div role="columnheader">${escapeHtml(t('network.appliedRule'))}</div>
      <div role="columnheader">${escapeHtml(t('network.result'))}</div>
      <div role="columnheader" class="col-actions">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `
  const rows = entries.map(entry => `
    <div class="table-row row-network clickable-row"
         data-entry-id="${entry.id}"
         ${state.selectedNetworkEntryId === entry.id ? 'data-selected="true"' : ''}>
      <div>${escapeHtml(entry.method || '—')}</div>
      <div class="cell-network-url" title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</div>
      <div>${escapeHtml(String(entry.status ?? '—'))}</div>
      <div>${escapeHtml(entry.resourceType || '')}</div>
      <div>${escapeHtml(getAppliedRuleLabel(entry))}</div>
      <div>${escapeHtml(getResultLabel(entry))}</div>
      <div class="footer-actions">${renderButton({ label: t('network.createRule'), data: { 'full-create-from-request': entry.id } })}</div>
    </div>
  `).join('')
  return `${header}${rows}`
}

export function renderNetworkPagination(state) {
  const { filtered, pageSize, page, totalPages } = getNetworkPaginationSummary(state)
  return renderPagination({
    page,
    totalItems: filtered,
    pageSize,
    dataAction: 'full-network-page',
    className: 'network-pagination-controls',
    buttonClassName: 'btn network-page-btn',
    labels: {
      previous: t('network.previous'),
      next: t('network.next'),
      previousTitle: t('network.previousPage'),
      nextTitle: t('network.nextPage'),
      pageLabel: t('network.pageShort', { page, totalPages })
    }
  })
}

export function renderNetworkFooter(state) {
  const { filtered, pageSize, page, totalPages, countText } = getNetworkPaginationSummary(state)
  return renderPagination({
    page,
    totalItems: filtered,
    pageSize,
    countLabel: countText,
    countClassName: 'network-footer-count',
    countAttrs: { id: 'full-network-footer-count' },
    dataAction: 'full-network-page',
    className: 'network-pagination-controls',
    buttonClassName: 'btn network-page-btn',
    labels: {
      previous: t('network.previous'),
      next: t('network.next'),
      previousTitle: t('network.previousPage'),
      nextTitle: t('network.nextPage'),
      pageLabel: t('network.pageShort', { page, totalPages })
    }
  })
}

export function renderNetworkPage(state) {
  return `
    <section class="split-page network-page">
      <section class="card filters-card network-filters-card">
        <div class="filters-row">
          <input class="input" id="full-network-url" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilter.url || '')}" />
          <select class="select" id="full-network-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(m => `<option value="${m}" ${state.networkFilter.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <input class="input" id="full-network-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilter.status || '')}" />
          <label class="switch"><input type="checkbox" id="full-network-intercepted" ${state.networkFilter.interceptedOnly ? 'checked' : ''}/> ${t('network.interceptedOnly')}</label>
          ${renderButton({ id: 'full-network-clear', label: t('common.clear') })}
        </div>
      </section>
      <section class="card data-card network-data-card">
        <div class="table table-wide" id="full-network-table">
          ${renderNetworkRows(state)}
        </div>
        <div class="network-table-footer" id="full-network-pagination">
          ${renderNetworkFooter(state)}
        </div>
      </section>
    </section>
  `
}
