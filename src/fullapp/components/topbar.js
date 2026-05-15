import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderTopbar(state) {
  const attached = Boolean(state.attachedTabId && state.activeTab?.id === state.attachedTabId)
  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${attached ? 'ok' : 'off'}"></span>
          <strong>${attached ? t('dashboard.attached') : t('status.notAttached')}</strong>
        </div>
        <div class="muted" title="${escapeHtml(state.activeTab?.url || '')}">${escapeHtml(truncate(state.activeTab?.url || 'No active URL', 80))}</div>
      </div>
      <div class="actions">
        <button class="btn" id="full-attach-btn">${attached ? t('common.reattach') : t('common.attach')}</button>
        <button class="btn" id="full-detach-btn" ${attached ? '' : 'disabled'}>${t('common.detach')}</button>
        <button class="btn" id="full-reload-btn" ${attached ? '' : 'disabled'}>${t('common.reload')}</button>
      </div>
    </header>
  `
}
