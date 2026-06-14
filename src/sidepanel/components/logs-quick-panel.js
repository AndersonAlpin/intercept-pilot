import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { hasActiveCaptureContext } from '../../shared/capture-context.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { formatShowingCount, formatShowingRange } from '../../shared/ui/count.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
import { renderPagination } from '../../shared/ui/pagination.js'
import { renderSelect } from '../../shared/ui/select.js'

function getLogLevelOptions() {
  return [
    { value: 'ANY', label: t('common.all') },
    { value: 'error', label: t('logs.levels.error') },
    { value: 'warn', label: t('logs.levels.warn') },
    { value: 'info', label: t('logs.levels.info') }
  ]
}

function levelBadge(level) {
  const normalizedLevel = level === 'error' || level === 'warn' ? level : 'info'
  const kind = normalizedLevel === 'error' ? 'danger' : normalizedLevel === 'warn' ? 'warning' : 'success'
  return renderBadge({ label: t(`logs.levels.${normalizedLevel}`), variant: kind })
}

function isWebLog(log) {
  return String(log?.scope || '').toLowerCase() === 'web'
}

function getLogsQuickView(state) {
  const sourceLogs = state.filteredLogs || (state.logs || []).filter(isWebLog)
  const logs = state.pagedLogs || sourceLogs
  const total = (state.visibleLogs || []).filter(isWebLog).length
  const canClearLogs = total > 0
  const pageSize = Number(state.logsPagination?.pageSize || 20)
  const page = Number(state.logsPagination?.page || 1)
  const start = sourceLogs.length ? ((page - 1) * pageSize) + 1 : 0
  const end = Math.min(sourceLogs.length, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(sourceLogs.length / pageSize))
  const countText = sourceLogs.length
    ? formatShowingRange({
      start,
      end,
      total: sourceLogs.length,
      singular: t('logs.entityOne'),
      plural: t('logs.entityMany')
    })
    : formatShowingCount({
      shown: 0,
      total,
      singular: t('logs.entityOne'),
      plural: t('logs.entityMany')
    })
  return { sourceLogs, logs, total, canClearLogs, pageSize, page, totalPages, countText }
}

export function renderLogsQuickMeta(state) {
  const { sourceLogs, pageSize, page, totalPages, countText } = getLogsQuickView(state)
  return `
    <span class="small logs-results-count">${escapeHtml(countText)}</span>
    ${renderPagination({
      page,
      totalItems: sourceLogs.length,
      pageSize,
      compact: true,
      dataAction: 'side-logs-page',
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
    })}
  `
}

export function renderLogsQuickList(state) {
  const { logs } = getLogsQuickView(state)
  return logs.length ? logs.map(log => `
    <div class="item log-item" role="button" tabindex="0" data-side-log-detail="${escapeHtml(log.id)}" title="${escapeHtml(t('logs.openDetails'))}">
      <div class="item-title">
        <strong class="log-message" title="${escapeHtml(log.message || '')}">${escapeHtml(log.message || '')}</strong>
        ${levelBadge(log.level)}
      </div>
      <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
      ${log.url ? `<div class="item-meta log-url" title="${escapeHtml(log.url)}">${escapeHtml(log.url)}</div>` : ''}
    </div>
  `).join('') : renderEmptyState({ message: t(hasActiveCaptureContext(state) ? 'logs.webOnlyEmpty' : 'logs.activateCaptureToSeeLogs') })
}

export function renderLogsQuickPanel(state) {
  const { canClearLogs } = getLogsQuickView(state)
  return `
    <div class="card compact-card sticky-filters logs-panel">
      <div class="sticky-bar logs-sticky-bar">
        <div class="logs-head">
          <h2>${t('logs.title')}</h2>
          ${renderButton({
            id: 'logs-clear-btn',
            label: t('logs.clearLogs'),
            variant: 'warning',
            disabled: !canClearLogs,
            tooltip: !canClearLogs ? t('logs.clearDisabled') : ''
          })}
        </div>
        <div class="logs-filter-stack">
          ${renderSelect({ id: 'logs-filter-level', value: state.logsFilter?.level || 'ANY', options: getLogLevelOptions() })}
          <input class="input" id="logs-filter-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('logs.title').toLowerCase())}" value="${escapeHtml(state.logsFilter?.search || '')}" />
        </div>
        <div class="logs-quick-meta" id="side-logs-meta">
          ${renderLogsQuickMeta(state)}
        </div>
      </div>
      <div class="list" id="side-logs-list">
        ${renderLogsQuickList(state)}
      </div>
    </div>
  `
}

