import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderConnectionHeader(state) {
  const attachedTab = state.attachedTab || null
  const candidateTab = state.candidateTab || state.lastAttachableTab || null
  const attached = Boolean(state.attachedTabId && attachedTab)
  const statusClass = state.attachBusy ? 'is-busy' : attached ? 'is-attached' : 'is-detached'
  const statusText = state.attachBusy
    ? t('status.connecting')
    : attached
      ? t('status.attachedTabNumber', { position: attachedTab.position || '?' })
      : t('status.notAttached')
  const primaryTab = attached ? attachedTab : candidateTab
  const primaryTitle = primaryTab?.title || t('status.noAttachableTab')
  const primaryUrl = primaryTab?.url || ''
  const canFocusTab = Boolean(primaryTab?.id)

  return `
    <header class="header">
      <div class="header-top">
        <div class="brand">
          <img class="brand-logo" src="../assets/brand/logo-horizontal.png" alt="MockPilot" />
          <p class="attach-status ${statusClass}">${statusText}</p>
          ${canFocusTab
            ? `<button class="tab-focus-link" id="side-focus-tab-btn" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 52))}</button>`
            : `<p class="url-muted" title="${escapeHtml(primaryUrl)}">${escapeHtml(truncate(primaryTitle, 52))}</p>`
          }
        </div>
        <div class="header-actions compact">
          <button class="btn btn-open" id="open-fullapp-btn">${t('common.open')}</button>
          <button class="btn btn-attach ${attached ? 'warning' : 'primary'}" id="attach-btn" ${state.attachBusy ? 'disabled' : ''}>${state.attachBusy ? t('status.connecting') : attached ? t('common.reattach') : t('common.attach')}</button>
          <button class="btn ghost btn-detach" id="detach-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>${t('common.detach')}</button>
        </div>
      </div>
      <div class="header-secondary">
        <button class="link-btn" id="reload-tab-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>${t('status.reloadHint')}</button>
      </div>
    </header>
  `
}
