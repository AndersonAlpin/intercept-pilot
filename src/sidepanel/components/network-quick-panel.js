import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function statusBadge(status) {
  if (status == null || status === '') return '<span class="badge">—</span>'
  const code = Number(status)
    if (code >= 400 || code === 0) return `<span class="badge danger">${status}</span>`
    if (code >= 300) return `<span class="badge warning">${status}</span>`
    return `<span class="badge success">${status}</span>`
}

function getAppliedRuleLabel(entry) {
  return entry?.matchedRuleName ? entry.matchedRuleName : t('network.noRule')
}

function isRenderableNetworkEntry(entry) {
  const method = String(entry?.method || '').trim()
  const url = String(entry?.url || '').trim()
  return Boolean(method || url)
}

function hasActiveFilter(state) {
  const filter = state.networkFilters || {}
  return Boolean(filter.text || (filter.method || 'ANY') !== 'ANY' || filter.status || filter.interceptedOnly)
}

export function renderNetworkQuickCount(state) {
  const total = (state.networkEntries || []).filter(isRenderableNetworkEntry).length
  const filtered = (state.filteredNetworkEntries || []).length
  if (!filtered) return t('network.compactPageCountEmpty', { total })
  const pageSize = Number(state.networkPagination?.pageSize || 50)
  const page = Number(state.networkPagination?.page || 1)
  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(filtered, page * pageSize)
  return t('network.compactPageCount', { start, end, filtered })
}

export function renderNetworkQuickPagination(state) {
  const filtered = (state.filteredNetworkEntries || []).length
  const pageSize = Number(state.networkPagination?.pageSize || 50)
  const page = Number(state.networkPagination?.page || 1)
  const totalPages = Math.max(1, Math.ceil(filtered / pageSize))
  if (totalPages <= 1) return ''
  return `
    <div class="network-pagination">
      <button class="network-page-btn" type="button" data-side-network-page="prev" title="${escapeHtml(t('network.previousPage'))}" aria-label="${escapeHtml(t('network.previousPage'))}" ${page <= 1 ? 'disabled' : ''}>‹</button>
      <span class="network-page-label" aria-label="${escapeHtml(t('network.pageOf', { page, totalPages }))}">${page}/${totalPages}</span>
      <button class="network-page-btn" type="button" data-side-network-page="next" title="${escapeHtml(t('network.nextPage'))}" aria-label="${escapeHtml(t('network.nextPage'))}" ${page >= totalPages ? 'disabled' : ''}>›</button>
    </div>
  `
}

export function renderNetworkQuickRows(state) {
  const entries = state.pagedNetworkEntries || state.filteredNetworkEntries || []
  if (!entries.length) {
    return `<div class="empty">${t(hasActiveFilter(state) ? 'network.noResults' : 'network.noRequests')}</div>`
  }
  return entries.map(entry => `
    <div class="table-row">
      <div><strong>${escapeHtml(entry.method || '—')}</strong></div>
      <div class="url network-url"><strong title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</strong><span>${escapeHtml(getAppliedRuleLabel(entry))}</span></div>
      <div>${statusBadge(entry.status)}</div>
      <div class="footer-actions">
        <button class="btn" data-create-from-request="${entry.id}">${t('rules.mockThis')}</button>
        <button class="btn" data-open-inspect="${entry.id}">${t('rules.inspect')}</button>
      </div>
    </div>
  `).join('')
}

export function renderNetworkQuickPanel(state) {
  return `
    <div class="card compact-card sticky-filters">
      <div class="sticky-bar">
        <div class="row space-between">
          <h2>${t('network.title')}</h2>
          <div class="footer-actions">
            <button class="btn" id="network-refresh-btn">${t('common.refresh')}</button>
            <button class="btn" id="network-clear-btn">${t('common.clear')}</button>
          </div>
        </div>
        <div class="column">
          <input class="input" id="network-filter-text" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilters.text)}" />
          <select class="select" id="network-filter-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(method => `<option value="${method}" ${state.networkFilters.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
          <input class="input" id="network-filter-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilters.status)}" />
          <label class="switch"><input type="checkbox" id="network-filter-intercepted" ${state.networkFilters.interceptedOnly ? 'checked' : ''}/> ${t('network.interceptedOnly')}</label>
          <div class="network-quick-meta">
            <span class="small network-results-count" id="network-results-count">${escapeHtml(renderNetworkQuickCount(state))}</span>
            <div id="network-pagination-controls">${renderNetworkQuickPagination(state)}</div>
          </div>
        </div>
      </div>
      <div class="table" id="network-entries-table">
        ${renderNetworkQuickRows(state)}
      </div>
    </div>
  `
}
