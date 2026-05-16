import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderConnectionHeader(state) {
  const attached = Boolean(state.attachedTabId && state.activeTab?.id === state.attachedTabId)
  const statusClass = state.attachBusy ? 'is-busy' : attached ? 'is-attached' : 'is-detached'
  const statusText = state.attachBusy ? t('status.connecting') : attached ? t('status.attached') : t('status.notAttached')
  const urlText = state.activeTab?.url ? truncate(state.activeTab.url, 52) : t('status.noActiveUrl')

  return `
    <header class="header">
      <div class="header-top">
        <div class="brand">
          <img class="brand-logo" src="../assets/brand/logo-horizontal.png" alt="MockPilot" />
          <p class="attach-status ${statusClass}">${statusText}</p>
          <p class="url-muted" title="${escapeHtml(state.activeTab?.url || '')}">${escapeHtml(urlText)}</p>
        </div>
        <div class="header-actions compact">
          <button class="btn" id="open-fullapp-btn">${t('common.open')}</button>
          <button class="btn ${attached ? 'warning' : 'primary'}" id="attach-btn" ${state.attachBusy ? 'disabled' : ''}>${state.attachBusy ? t('status.connecting') : attached ? t('common.reattach') : t('common.attach')}</button>
          <button class="btn ghost" id="detach-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>${t('common.detach')}</button>
        </div>
      </div>
      <div class="header-secondary">
        <button class="link-btn" id="reload-tab-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>${t('status.reloadHint')}</button>
      </div>
    </header>
  `
}
