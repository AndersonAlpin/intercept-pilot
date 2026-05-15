import { escapeHtml, truncate } from '../../shared/utils.js'

export function renderTopbar(state) {
  const attached = Boolean(state.attachedTabId && state.activeTab?.id === state.attachedTabId)
  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${attached ? 'ok' : 'off'}"></span>
          <strong>${attached ? 'Attached' : 'Detached'}</strong>
        </div>
        <div class="muted" title="${escapeHtml(state.activeTab?.url || '')}">${escapeHtml(truncate(state.activeTab?.url || 'No active URL', 80))}</div>
      </div>
      <div class="actions">
        <button class="btn" id="full-attach-btn">${attached ? 'Reattach' : 'Attach'}</button>
        <button class="btn" id="full-detach-btn" ${attached ? '' : 'disabled'}>Detach</button>
        <button class="btn" id="full-reload-btn" ${attached ? '' : 'disabled'}>Reload</button>
      </div>
    </header>
  `
}
