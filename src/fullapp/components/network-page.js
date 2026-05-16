import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderNetworkRows(state) {
  const entries = state.filteredNetworkEntries || state.networkEntries
  return `
    ${entries.length ? entries.slice(0, 200).map(entry => `
      <div class="table-row row-network">
        <div>${escapeHtml(entry.method || '—')}</div>
        <div title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</div>
        <div>${entry.status ?? '—'}</div>
        <div>${escapeHtml(entry.resourceType || '')}</div>
        <div>${escapeHtml(entry.matchedRuleName || t('rules.passThrough'))}</div>
        <div>${escapeHtml(entry.appliedAction || t('rules.passThrough'))}</div>
        <div class="footer-actions"><button class="btn" data-full-create-from-request="${entry.id}">${t('network.createRule')}</button></div>
      </div>
    `).join('') : `<div class="empty">${t('network.noRequests')}</div>`}
  `
}

export function renderNetworkPage(state) {
  return `
    <section class="card">
      <div class="toolbar">
        <input class="input" id="full-network-url" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilter.url || '')}" />
        <select class="select" id="full-network-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(m => `<option value="${m}" ${state.networkFilter.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <input class="input" id="full-network-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilter.status || '')}" />
        <label class="switch"><input type="checkbox" id="full-network-matched" ${state.networkFilter.matchedOnly ? 'checked' : ''}/> ${t('network.matchedOnly')}</label>
        <label class="switch"><input type="checkbox" id="full-network-intercepted" ${state.networkFilter.interceptedOnly ? 'checked' : ''}/> ${t('network.interceptedOnly')}</label>
        <button class="btn" id="full-network-clear">${t('common.clear')}</button>
      </div>
      <div class="table table-wide" id="full-network-table">
        ${renderNetworkRows(state)}
      </div>
    </section>
  `
}
