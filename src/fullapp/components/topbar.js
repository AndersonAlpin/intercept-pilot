import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderTopbar(state) {
  const attachedTab = state.attachedTab || null
  const currentTab = state.candidateTab || state.lastAttachableTab || null
  const attached = Boolean(state.attachedTabId && attachedTab)
  const autoAttachEnabled = Boolean(state.settings?.autoAttach)
  const primaryTab = attached ? attachedTab : currentTab
  const statusText = attached
    ? t('status.attachedTabNumber', { position: attachedTab?.position || '?' })
    : t('status.notAttached')
  const eligibilityText = attached
    ? ''
    : currentTab
      ? ''
      : t('status.noEligibleTab')
  const primaryTitle = primaryTab?.title || t('status.noAttachableTab')
  const primaryUrl = primaryTab?.url || ''
  const canFocusTab = Boolean(primaryTab?.id)
  const canReload = Boolean(state.attachedTab?.id || state.candidateTab?.id || state.lastAttachableTab?.id)
  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${attached ? 'ok' : 'off'}"></span>
          <strong>${escapeHtml(statusText)}</strong>
        </div>
        ${eligibilityText ? `<div class="muted">${escapeHtml(eligibilityText)}</div>` : ''}
        ${canFocusTab
          ? `<button class="tab-focus-link" id="full-focus-tab-btn" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 80))}</button>`
          : (eligibilityText ? '' : `<div class="muted" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 80))}</div>`)
        }
        ${autoAttachEnabled ? `<button class="auto-attach-link" id="full-open-auto-attach-settings" title="${escapeHtml(t('status.openAutoAttachSettings'))}" aria-label="${escapeHtml(t('status.openAutoAttachSettings'))}">${t('status.autoAttachActive')}</button>` : ''}
        ${primaryUrl ? `<div class="muted" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryUrl, 110))}</div>` : ''}
      </div>
      <div class="actions">
        ${autoAttachEnabled
          ? `
            <button class="btn" id="full-reload-btn" ${canReload ? '' : 'disabled'}>${t('common.reload')}</button>
          `
          : `
            <button class="btn ${attached ? 'warning' : 'primary'}" id="full-attach-btn">${attached ? t('common.reattach') : t('common.attach')}</button>
            <button class="btn" id="full-detach-btn" ${attached ? '' : 'disabled'}>${t('common.detach')}</button>
            <button class="btn" id="full-reload-btn" ${canReload ? '' : 'disabled'}>${t('common.reload')}</button>
          `}
      </div>
    </header>
  `
}
