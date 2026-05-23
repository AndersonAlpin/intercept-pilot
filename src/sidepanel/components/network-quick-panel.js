import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { hasActiveCaptureContext } from '../../shared/capture-context.js'
import { formatNetworkDisplayUrl } from '../../shared/network-display.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { formatShowingCount, formatShowingRange } from '../../shared/ui/count.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
import { renderPagination } from '../../shared/ui/pagination.js'
import { renderSelect } from '../../shared/ui/select.js'
import { renderSwitch } from '../../shared/ui/toggle.js'

function getNetworkMethodOptions() {
  return ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    .map(method => ({ value: method, label: method === 'ANY' ? t('common.all') : method }))
}

function statusBadge(status) {
  if (status == null || status === '') return renderBadge({ label: '—' })
  const code = Number(status)
  if (code >= 400 || code === 0) return renderBadge({ label: status, variant: 'danger' })
  if (code >= 300) return renderBadge({ label: status, variant: 'warning' })
  return renderBadge({ label: status, variant: 'success' })
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
  const total = (state.visibleNetworkEntries || []).filter(isRenderableNetworkEntry).length
  const filtered = (state.filteredNetworkEntries || []).length
  if (!filtered) {
    return formatShowingCount({
      shown: 0,
      total,
      singular: t('network.entityOne'),
      plural: t('network.entityMany')
    })
  }
  const pageSize = Number(state.networkPagination?.pageSize || 50)
  const page = Number(state.networkPagination?.page || 1)
  const start = ((page - 1) * pageSize) + 1
  const end = Math.min(filtered, page * pageSize)
  return formatShowingRange({
    start,
    end,
    total: filtered,
    singular: t('network.entityOne'),
    plural: t('network.entityMany')
  })
}

export function renderNetworkQuickPagination(state) {
  const filtered = (state.filteredNetworkEntries || []).length
  const pageSize = Number(state.networkPagination?.pageSize || 50)
  const page = Number(state.networkPagination?.page || 1)
  const totalPages = Math.max(1, Math.ceil(filtered / pageSize))
  return renderPagination({
    page,
    totalItems: filtered,
    pageSize,
    compact: true,
    dataAction: 'side-network-page',
    className: 'network-pagination',
    buttonClassName: 'network-page-btn',
    labels: {
      previousHtml: icon('chevron-left', 14),
      nextHtml: icon('chevron-right', 14),
      previousTitle: t('network.previousPage'),
      nextTitle: t('network.nextPage'),
      pageLabel: `${page}/${totalPages}`,
      pageAriaLabel: t('network.pageOf', { page, totalPages })
    }
  })
}

export function renderNetworkQuickRows(state) {
  const entries = state.pagedNetworkEntries || state.filteredNetworkEntries || []
  if (!entries.length) {
    if (!hasActiveCaptureContext(state)) {
      return renderEmptyState({ message: t('network.activateCaptureToSeeRequests') })
    }
    const lightCapture = state.settings?.captureMode === 'compat' || Boolean(state.compatActiveTabId)
    return renderEmptyState({
      message: t(hasActiveFilter(state) ? 'network.noResults' : 'network.noRequests'),
      helper: lightCapture ? t('network.lightCaptureHelper') : ''
    })
  }
  return entries.map(entry => `
    <div class="table-row">
      <div><strong>${escapeHtml(entry.method || '—')}</strong></div>
      <div class="url network-url"><strong title="${escapeHtml(entry.url)}">${escapeHtml(formatNetworkDisplayUrl(entry.url, { compact: true }))}</strong><span>${escapeHtml(getAppliedRuleLabel(entry))}</span></div>
      <div>${statusBadge(entry.status)}</div>
      <div class="footer-actions">
        ${renderButton({ label: t('rules.mockThis'), variant: 'primary', data: { 'create-from-request': entry.id } })}
        ${renderButton({ label: t('rules.inspect'), variant: 'info', data: { 'open-inspect': entry.id } })}
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
            ${renderButton({ id: 'network-clear-btn', label: t('network.clearNetwork'), variant: 'warning' })}
          </div>
        </div>
        <div class="column">
          <input class="input" id="network-filter-text" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilters.text)}" />
          ${renderSelect({ id: 'network-filter-method', value: state.networkFilters.method, options: getNetworkMethodOptions() })}
          <input class="input" id="network-filter-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilters.status)}" />
          ${renderSwitch({ id: 'network-filter-intercepted', checked: state.networkFilters.interceptedOnly, label: t('network.interceptedOnly') })}
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
