import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function hasActiveLogsFilter(state) {
  const f = state.logsFilter
  return Boolean((f.level && f.level !== 'ANY') || f.search)
}

function levelBadge(level) {
  const kind = level === 'error' ? 'danger' : level === 'warn' ? 'warning' : 'success'
  return `<span class="badge ${kind}">${escapeHtml(level || 'info')}</span>`
}

export function renderLogsPage(state) {
  const logs = state.filteredLogs || state.logs
  const total = state.logs.length
  const filtered = state.filteredLogs?.length ?? total
  const countText = t('network.resultsCount', { filtered, total })
  const emptyKey = hasActiveLogsFilter(state) ? 'logs.noResults' : 'logs.noLogs'

  const header = `
    <div class="table-row row-logs rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('logs.columns.message'))}</div>
      <div role="columnheader">${escapeHtml(t('common.level'))}</div>
      <div role="columnheader">${escapeHtml(t('logs.columns.time'))}</div>
      <div role="columnheader">${escapeHtml(t('logs.columns.url'))}</div>
    </div>
  `

  return `
    <section class="split-page logs-page">
      <section class="card filters-card logs-filters-card">
        <div class="filters-row">
          <select class="select" id="full-logs-level">${['ANY','error','warn','info'].map(level => `<option value="${level}" ${state.logsFilter.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select>
          <input class="input" id="full-logs-search" placeholder="${escapeHtml(t('common.search') + ' ' + t('logs.title').toLowerCase())}" value="${escapeHtml(state.logsFilter.search || '')}" />
          <button class="btn" id="full-clear-logs">${t('logs.clearLogs')}</button>
          <span class="results-count">${escapeHtml(countText)}</span>
        </div>
      </section>
      <section class="card data-card logs-data-card">
        <div class="table table-wide">
          ${logs.length ? header : ''}
          ${logs.length ? logs.slice(0, 200).map(log => `
            <div class="table-row row-logs">
              <div class="cell-network-url" title="${escapeHtml(log.message || '')}">${escapeHtml(log.message || '')}</div>
              <div>${levelBadge(log.level || 'info')}</div>
              <div>${escapeHtml(log.timestamp || '')}</div>
              <div class="cell-network-url" title="${escapeHtml(log.url || '')}">${escapeHtml(log.url || '—')}</div>
            </div>
          `).join('') : `<div class="empty">${escapeHtml(t(emptyKey === 'logs.noLogs' ? 'logs.webOnlyEmpty' : emptyKey))}</div>`}
        </div>
      </section>
    </section>
  `
}

