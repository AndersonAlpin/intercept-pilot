import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderLogsQuickPanel(state) {
  const logs = (state.filteredLogs || state.logs).slice(0, 20)
  return `
    <div class="card compact-card sticky-filters logs-panel">
      <div class="sticky-bar logs-sticky-bar">
        <div class="logs-head">
          <h2>${t('logs.title')}</h2>
        </div>
        <div class="logs-scope-row">
          <select class="select" id="logs-scope">${['ANY','app','web'].map(scope => `<option value="${scope}" ${state.logsScope === scope ? 'selected' : ''}>${scope === 'ANY' ? t('logs.scopeAny') : scope === 'app' ? t('logs.scopeApp') : t('logs.scopeWeb')}</option>`).join('')}</select>
        </div>
        <div class="logs-actions-row">
          <label class="switch"><input type="checkbox" id="logs-error-only" ${state.logsErrorOnly ? 'checked' : ''}/> ${t('logs.errorOnly')}</label>
          <button class="btn" id="logs-clear-btn">${t('logs.clearLogs')}</button>
        </div>
      </div>
      <div class="list">
        ${logs.length ? logs.map(log => `
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(log.message || '')}</strong>
              ${log.level === 'error' ? `<span class="badge danger">${t('badges.error')}</span>` : log.level === 'warn' ? `<span class="badge warning">${t('badges.warn')}</span>` : `<span class="badge success">${t('badges.info')}</span>`}
            </div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : `<div class="empty">${t('logs.noLogs')}</div>`}
      </div>
      <div class="footer-actions"><button class="btn" id="open-diagnostics-btn">${t('common.diagnostics')} ↗</button></div>
    </div>
  `
}
