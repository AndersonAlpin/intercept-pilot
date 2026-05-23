import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderBadge } from '../../shared/ui/badge.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderEmptyState } from '../../shared/ui/empty-state.js'
import { renderSwitch } from '../../shared/ui/toggle.js'

function levelBadge(level) {
  if (level === 'error') return renderBadge({ label: t('badges.error'), variant: 'danger' })
  if (level === 'warn') return renderBadge({ label: t('badges.warn'), variant: 'warning' })
  return renderBadge({ label: t('badges.info'), variant: 'success' })
}

export function renderLogsQuickPanel(state) {
  const logs = (state.filteredLogs || state.logs).slice(0, 20)
  return `
    <div class="card compact-card sticky-filters logs-panel">
      <div class="sticky-bar logs-sticky-bar">
        <div class="logs-head">
          <h2>${t('logs.title')}</h2>
        </div>
        <div class="logs-actions-row">
          ${renderSwitch({ id: 'logs-error-only', checked: state.logsErrorOnly, label: t('logs.errorOnly') })}
          ${renderButton({ id: 'logs-clear-btn', label: t('logs.clearLogs') })}
        </div>
      </div>
      <div class="list">
        ${logs.length ? logs.map(log => `
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(log.message || '')}</strong>
              ${levelBadge(log.level)}
            </div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') : renderEmptyState({ message: t('logs.webOnlyEmpty') })}
      </div>
      <div class="footer-actions">${renderButton({ id: 'open-diagnostics-btn', label: `${t('common.diagnostics')} ↗` })}</div>
    </div>
  `
}

