import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderTopbar(state) {
  const attachedTab = state.attachedTab || null
  const currentTab = state.candidateTab || state.lastAttachableTab || null
  const attached = Boolean(state.attachedTabId && attachedTab)
  const primaryTab = attached ? attachedTab : currentTab
  const statusText = attached
    ? t('status.attachedTabNumber', { position: attachedTab?.position || '?' })
    : t('status.notAttached')
  const primaryTitle = primaryTab?.title || t('status.noAttachableTab')
  const primaryUrl = primaryTab?.url || ''
  const canFocusTab = Boolean(primaryTab?.id)
  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${attached ? 'ok' : 'off'}"></span>
          <strong>${escapeHtml(statusText)}</strong>
        </div>
        ${canFocusTab
          ? `<button class="tab-focus-link" id="full-focus-tab-btn" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 80))}</button>`
          : `<div class="muted" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 80))}</div>`
        }
        ${primaryUrl ? `<div class="muted" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryUrl, 110))}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn" id="full-attach-btn">${attached ? t('common.reattach') : t('common.attach')}</button>
        <button class="btn" id="full-detach-btn" ${attached ? '' : 'disabled'}>${t('common.detach')}</button>
        <button class="btn" id="full-reload-btn" ${attached ? '' : 'disabled'}>${t('common.reload')}</button>
      </div>
    </header>
  `
}
