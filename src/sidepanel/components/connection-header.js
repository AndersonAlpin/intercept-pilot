import { escapeHtml, truncate } from '../../shared/utils.js'

export function renderConnectionHeader(state) {
  const attached = Boolean(state.attachedTabId && state.activeTab?.id === state.attachedTabId)
  const statusClass = state.attachBusy ? 'is-busy' : attached ? 'is-attached' : 'is-detached'
  const statusText = state.attachBusy ? 'Connecting...' : attached ? 'Attached to current tab' : 'Not attached'
  const urlText = state.activeTab?.url ? truncate(state.activeTab.url, 52) : 'No active URL'

  return `
    <header class="header">
      <div class="header-top">
        <div class="brand">
          <h1>MockPilot</h1>
          <p class="attach-status ${statusClass}">${statusText}</p>
          <p class="url-muted" title="${escapeHtml(state.activeTab?.url || '')}">${escapeHtml(urlText)}</p>
        </div>
        <div class="header-actions compact">
          <button class="btn" id="open-fullapp-btn">Open</button>
          <button class="btn ${attached ? 'warning' : 'primary'}" id="attach-btn" ${state.attachBusy ? 'disabled' : ''}>${state.attachBusy ? 'Attaching...' : attached ? 'Reattach' : 'Attach'}</button>
          <button class="btn ghost" id="detach-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>Detach</button>
        </div>
      </div>
      <div class="header-secondary">
        <button class="link-btn" id="reload-tab-btn" ${(!attached || state.attachBusy) ? 'disabled' : ''}>Reload current page to apply rules</button>
      </div>
    </header>
  `
}
