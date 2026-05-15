import { escapeHtml, truncate } from '../../shared/utils.js'

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
    <div class="card compact-card">
      <div class="row space-between">
        <h2>Network</h2>
        <div class="footer-actions">
          <button class="btn" id="network-refresh-btn">Refresh</button>
          <button class="btn" id="network-clear-btn">Clear</button>
        </div>
      </div>
      <div class="column">
        <input class="input" id="network-filter-text" placeholder="Filter URL" value="${escapeHtml(state.networkFilters.text)}" />
        <select class="select" id="network-filter-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(method => `<option value="${method}" ${state.networkFilters.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
        <input class="input" id="network-filter-status" placeholder="Status" value="${escapeHtml(state.networkFilters.status)}" />
        <label class="switch"><input type="checkbox" id="network-filter-matched" ${state.networkFilters.matchedOnly ? 'checked' : ''}/> matched only</label>
        <label class="switch"><input type="checkbox" id="network-filter-intercepted" ${state.networkFilters.interceptedOnly ? 'checked' : ''}/> intercepted only</label>
      </div>
      <div class="table">
        ${entries.length ? entries.slice(0, 20).map(entry => `
          <div class="table-row">
            <div><strong>${escapeHtml(entry.method || '—')}</strong></div>
            <div class="url"><strong title="${escapeHtml(entry.url)}">${escapeHtml(truncate(entry.url, 52))}</strong><span>${escapeHtml(entry.matchedRuleName || 'passThrough')}</span></div>
            <div>${statusBadge(entry.status)}</div>
            <div class="footer-actions">
              <button class="btn" data-create-from-request="${entry.id}">Mock this</button>
              <button class="btn" data-open-inspect="${entry.id}">Inspect ↗</button>
            </div>
          </div>
        `).join('') : '<div class="empty">No requests yet.</div>'}
      </div>
    </div>
  `
}
