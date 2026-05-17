import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function hasActiveLogsFilter(state) {
  const f = state.logsFilter
  return Boolean((f.level && f.level !== 'ANY') || f.search)
}

export function renderLogsPage(state) {
  const logs = state.filteredLogs || state.logs
  const total = state.logs.length
  const filtered = state.filteredLogs?.length ?? total
  const countText = t('network.resultsCount', { filtered, total })
  const emptyKey = hasActiveLogsFilter(state) ? 'logs.noResults' : 'logs.noLogs'

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
        <div class="list">
          ${logs.length ? logs.slice(0, 200).map(log => `
            <div class="item">
              <div class="item-title"><strong>${escapeHtml(log.message || '')}</strong><span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || 'info')}</span></div>
              <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
              ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
            </div>
          `).join('') : `<div class="empty">${escapeHtml(t(emptyKey))}</div>`}
        </div>
      </section>
    </section>
  `
}
