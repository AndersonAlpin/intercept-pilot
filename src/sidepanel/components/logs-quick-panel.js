import { escapeHtml } from '../../shared/utils.js'

export function renderLogsQuickPanel(state) {
  const logs = state.logs.slice(0, 20).filter(log => !state.logsErrorOnly || log.level === 'error')
  return `
    <div class="card compact-card">
      <div class="row space-between">
        <h2>Logs</h2>
        <div class="footer-actions">
          <label class="switch"><input type="checkbox" id="logs-error-only" ${state.logsErrorOnly ? 'checked' : ''}/> error only</label>
          <button class="btn" id="logs-clear-btn">Clear logs</button>
        </div>
      </div>
      <div class="list">
        ${logs.length ? logs.map(log => `
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(log.message || '')}</strong>
              ${log.level === 'error' ? '<span class="badge danger">error</span>' : log.level === 'warn' ? '<span class="badge warning">warn</span>' : '<span class="badge success">info</span>'}
            </div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : '<div class="empty">No logs.</div>'}
      </div>
      <div class="footer-actions"><button class="btn" id="open-diagnostics-btn">Diagnostics ↗</button></div>
    </div>
  `
}
