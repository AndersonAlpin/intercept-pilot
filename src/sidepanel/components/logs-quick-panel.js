import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
import { renderSwitch } from '../../shared/ui/toggle.js'

function levelBadge(level) {
  const normalizedLevel = level === 'error' || level === 'warn' ? level : 'info'
  const kind = normalizedLevel === 'error' ? 'danger' : normalizedLevel === 'warn' ? 'warning' : 'success'
  return renderBadge({ label: t(`logs.levels.${normalizedLevel}`), variant: kind })
}

function isWebLog(log) {
  return String(log?.scope || '').toLowerCase() === 'web'
}

export function renderLogsQuickPanel(state) {
  const sourceLogs = state.filteredLogs || (state.logs || []).filter(isWebLog)
  const logs = sourceLogs.slice(0, 20)
  const countText = formatShowingCount({
    shown: logs.length,
    total: (state.logs || []).filter(isWebLog).length,
    singular: t('logs.entityOne'),
    plural: t('logs.entityMany')
  })
  return `
    <div class="card compact-card sticky-filters logs-panel">
      <div class="sticky-bar logs-sticky-bar">
        <div class="logs-head">
          <h2>${t('logs.title')}</h2>
          ${renderButton({ id: 'logs-clear-btn', label: t('logs.clearLogs'), variant: 'warning' })}
        </div>
        <div class="logs-actions-row">
          ${renderSwitch({ id: 'logs-error-only', checked: state.logsErrorOnly, label: t('logs.errorOnly') })}
        </div>
      </div>
      <div class="list">
        ${logs.length ? logs.map(log => `
          <div class="item">
            <div class="item-title">
              <strong class="log-message" title="${escapeHtml(log.message || '')}">${escapeHtml(log.message || '')}</strong>
              ${levelBadge(log.level)}
            </div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta log-url" title="${escapeHtml(log.url)}">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : renderEmptyState({ message: t('logs.webOnlyEmpty') })}
      </div>
      <div class="sidepanel-list-footer">
        <span class="small">${escapeHtml(countText)}</span>
        ${renderButton({ id: 'open-diagnostics-btn', label: `${t('common.diagnostics')} ↗`, variant: 'info' })}
      </div>
    </div>
  `
}

