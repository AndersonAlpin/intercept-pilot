import { escapeHtml } from '../../shared/utils.js'

export function renderLogsPage(state) {
  const logs = state.filteredLogs || state.logs
  return `
    <section class="card">
      <div class="toolbar">
        <select class="select" id="full-logs-level">${['ANY','error','warn','info'].map(level => `<option value="${level}" ${state.logsFilter.level === level ? 'selected' : ''}>${level}</option>`).join('')}</select>
        <input class="input" id="full-logs-search" placeholder="Search logs" value="${escapeHtml(state.logsFilter.search || '')}" />
        <button class="btn" id="full-clear-logs">Clear logs</button>
      </div>
      <div class="list">
        ${logs.length ? logs.slice(0, 200).map(log => `
          <div class="item">
            <div class="item-title"><strong>${escapeHtml(log.message || '')}</strong><span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || 'info')}</span></div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : '<div class="empty">No logs.</div>'}
      </div>
    </section>
  `
}
