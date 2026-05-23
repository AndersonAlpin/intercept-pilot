import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
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
  const total = state.logs.filter(isWebLog).length
  const countText = formatShowingCount({
    shown: Math.min(logs.length, 200),
    total,
    singular: t('logs.entityOne'),
    plural: t('logs.entityMany')
  })
  const emptyKey = hasActiveLogsFilter(state) ? 'logs.noResults' : 'logs.noLogs'

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
  const bodyHtml = `
    <div class="table table-wide">
      ${logs.length ? header : ''}
      ${logs.length ? logs.slice(0, 200).map(log => `
        <div class="table-row row-logs">
          <div class="cell-network-url" title="${escapeHtml(log.message || '')}">${escapeHtml(log.message || '')}</div>
          <div>${levelBadge(log.level || 'info')}</div>
          <div>${escapeHtml(log.timestamp || '')}</div>
          <div class="cell-network-url" title="${escapeHtml(log.url || '')}">${escapeHtml(log.url || '—')}</div>
        </div>
      `).join('') : renderEmptyState({ message: t(emptyKey === 'logs.noLogs' ? 'logs.webOnlyEmpty' : emptyKey) })}
    </div>
  `

  return `
    <section class="split-page logs-page">
      ${renderDataPanel({
        title: t('logs.title'),
        actionsHtml: renderButton({ id: 'full-clear-logs', label: t('logs.clearLogs'), variant: 'warning' }),
        filtersHtml,
        bodyHtml,
        footerHtml: `<span class="data-panel__count">${escapeHtml(countText)}</span>`,
        className: 'logs-data-panel'
      })}
    </section>
  `
}

