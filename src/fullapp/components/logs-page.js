import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderLogsPage(state) {
  const logs = state.filteredLogs || state.logs
  return `
    <section class="card sticky-toolbar">
      <div class="toolbar">
        <select class="select" id="full-logs-level">${['ANY','error','warn','info'].map(level => `<option value="${level}" ${state.logsFilter.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select>
        <input class="input" id="full-logs-search" placeholder="${t('common.search')} ${t('logs.title').toLowerCase()}" value="${escapeHtml(state.logsFilter.search || '')}" />
        <button class="btn" id="full-clear-logs">${t('logs.clearLogs')}</button>
      </div>
      <div class="list">
        ${logs.length ? logs.slice(0, 200).map(log => `
          <div class="item">
            <div class="item-title"><strong>${escapeHtml(log.message || '')}</strong><span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || 'info')}</span></div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : `<div class="empty">${t('logs.noLogs')}</div>`}
      </div>
    </section>
  `
}
