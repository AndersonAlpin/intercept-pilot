import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function statusBadge(status) {
  if (status == null || status === '') return '<span class="badge">—</span>'
  const code = Number(status)
    if (code >= 400 || code === 0) return `<span class="badge danger">${status}</span>`
    if (code >= 300) return `<span class="badge warning">${status}</span>`
    return `<span class="badge success">${status}</span>`
}

export function renderNetworkQuickPanel(state) {
  const entries = state.filteredNetworkEntries || []
  return `
    <div class="card compact-card sticky-filters">
      <div class="sticky-bar">
        <div class="row space-between">
          <h2>${t('network.title')}</h2>
          <div class="footer-actions">
            <button class="btn" id="network-refresh-btn">${t('common.refresh')}</button>
            <button class="btn" id="network-clear-btn">${t('common.clear')}</button>
          </div>
        </div>
        <div class="column">
          <input class="input" id="network-filter-text" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilters.text)}" />
          <select class="select" id="network-filter-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(method => `<option value="${method}" ${state.networkFilters.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
          <input class="input" id="network-filter-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilters.status)}" />
          <label class="switch"><input type="checkbox" id="network-filter-intercepted" ${state.networkFilters.interceptedOnly ? 'checked' : ''}/> ${t('network.interceptedOnly')}</label>
        </div>
      </div>
      <div class="table">
        ${entries.length ? entries.slice(0, 20).map(entry => `
            <div class="table-row">
              <div><strong>${escapeHtml(entry.method || '—')}</strong></div>
            <div class="url network-url"><strong title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</strong><span>${escapeHtml(entry.matchedRuleName || t('rules.passThrough'))}</span></div>
            <div>${statusBadge(entry.status)}</div>
            <div class="footer-actions">
              <button class="btn" data-create-from-request="${entry.id}">${t('rules.mockThis')}</button>
              <button class="btn" data-open-inspect="${entry.id}">${t('rules.inspect')}</button>
            </div>
          </div>
        `).join('') : `<div class="empty">${t('network.noRequests')}</div>`}
      </div>
    </div>
  `
}
