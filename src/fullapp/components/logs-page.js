import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { hasActiveCaptureContext } from '../../shared/capture-context.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { formatShowingCount, formatShowingRange } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
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

function isWebLog(log) {
  return String(log?.scope || '').toLowerCase() === 'web'
}

function hasActiveLogsFilter(state) {
  const f = state.logsFilter
  return Boolean((f.level && f.level !== 'ANY') || f.search)
}

function levelBadge(level) {
  const normalizedLevel = level === 'error' || level === 'warn' ? level : 'info'
  const kind = normalizedLevel === 'error' ? 'danger' : normalizedLevel === 'warn' ? 'warning' : 'success'
  return renderBadge({ label: t(`logs.levels.${normalizedLevel}`), variant: kind })
}

export function renderLogsPage(state) {
  const logs = state.filteredLogs || state.logs.filter(isWebLog)
  const pagedLogs = state.pagedLogs || logs
  const total = (state.visibleLogs || []).filter(isWebLog).length
  const canClearLogs = total > 0
  const pageSize = Number(state.logsPagination?.pageSize || 100)
  const page = Number(state.logsPagination?.page || 1)
  const start = logs.length ? ((page - 1) * pageSize) + 1 : 0
  const end = Math.min(logs.length, page * pageSize)
  const totalPages = Math.max(1, Math.ceil(logs.length / pageSize))
  const countText = logs.length
    ? formatShowingRange({
      start,
      end,
      total: logs.length,
      singular: t('logs.entityOne'),
      plural: t('logs.entityMany')
    })
    : formatShowingCount({
      shown: 0,
      total,
      singular: t('logs.entityOne'),
      plural: t('logs.entityMany')
    })
  const emptyMessage = !hasActiveCaptureContext(state)
    ? t('logs.activateCaptureToSeeLogs')
    : t(hasActiveLogsFilter(state) ? 'logs.noResults' : 'logs.webOnlyEmpty')

  const header = `
    <div class="table-row row-logs rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('logs.columns.message'))}</div>
      <div role="columnheader">${escapeHtml(t('common.level'))}</div>
      <div role="columnheader">${escapeHtml(t('logs.columns.time'))}</div>
      <div role="columnheader">${escapeHtml(t('logs.columns.url'))}</div>
    </div>
  `

  const filtersHtml = `
    <div class="filters-row">
      ${renderSelect({ id: 'full-logs-level', value: state.logsFilter.level, options: getLogLevelOptions(), className: 'filter-small' })}
      <input class="input filter-grow" id="full-logs-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('logs.title').toLowerCase())}" value="${escapeHtml(state.logsFilter.search || '')}" />
    </div>
  `
  const rowsHtml = pagedLogs.length ? pagedLogs.map(log => `
    <div class="table-row row-logs clickable-row" role="button" tabindex="0" data-full-log-detail="${escapeHtml(log.id)}" title="${escapeHtml(t('logs.openDetails'))}">
      <div class="cell-network-url" title="${escapeHtml(log.message || '')}">${escapeHtml(log.message || '')}</div>
      <div>${levelBadge(log.level || 'info')}</div>
      <div>${escapeHtml(log.timestamp || '')}</div>
      <div class="cell-network-url" title="${escapeHtml(log.url || '')}">${escapeHtml(log.url || '—')}</div>
    </div>
  `).join('') : renderEmptyState({ message: emptyMessage })
  const bodyHtml = `
    <div class="data-table data-table--logs" role="table">
      ${pagedLogs.length ? `<div class="data-table__header table table-wide">${header}</div>` : ''}
      <div class="data-table__rows table table-wide">
        ${rowsHtml}
      </div>
    </div>
  `

  return `
    <section class="split-page logs-page">
      ${renderDataPanel({
        title: t('logs.title'),
        actionsHtml: renderButton({
          id: 'full-clear-logs',
          label: t('logs.clearLogs'),
          variant: 'warning',
          disabled: !canClearLogs,
          tooltip: !canClearLogs ? t('logs.clearDisabled') : ''
        }),
        filtersHtml,
        bodyHtml,
        footerHtml: renderPagination({
          page,
          totalItems: logs.length,
          pageSize,
          countLabel: countText,
          countClassName: 'network-footer-count',
          dataAction: 'full-logs-page',
          className: 'network-pagination-controls',
          buttonClassName: 'btn network-page-btn',
          labels: {
            previous: t('network.previous'),
            next: t('network.next'),
            previousTitle: t('network.previousPage'),
            nextTitle: t('network.nextPage'),
            pageLabel: t('network.pageShort', { page, totalPages })
          }
        }),
        footerClassName: 'network-table-footer',
        footerAttrs: { id: 'full-logs-pagination' },
        className: 'logs-data-panel',
        scrollClassName: 'data-panel__scroll--table'
      })}
    </section>
  `
}

