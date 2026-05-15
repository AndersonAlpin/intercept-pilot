import { escapeHtml } from '../../shared/utils.js'

export function renderNetworkPage(state) {
  const entries = state.filteredNetworkEntries || state.networkEntries
  return `
    <section class="card">
      <div class="toolbar">
        <input class="input" id="full-network-url" placeholder="URL" value="${escapeHtml(state.networkFilter.url || '')}" />
        <select class="select" id="full-network-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(m => `<option value="${m}" ${state.networkFilter.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
        <input class="input" id="full-network-status" placeholder="Status" value="${escapeHtml(state.networkFilter.status || '')}" />
        <label class="switch"><input type="checkbox" id="full-network-matched" ${state.networkFilter.matchedOnly ? 'checked' : ''}/> matched only</label>
        <label class="switch"><input type="checkbox" id="full-network-intercepted" ${state.networkFilter.interceptedOnly ? 'checked' : ''}/> intercepted only</label>
        <button class="btn" id="full-network-clear">Clear</button>
      </div>
      <div class="table table-wide">
        ${entries.length ? entries.slice(0, 200).map(entry => `
          <div class="table-row row-network">
            <div>${escapeHtml(entry.method || '—')}</div>
            <div title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</div>
            <div>${entry.status ?? '—'}</div>
            <div>${escapeHtml(entry.resourceType || '')}</div>
            <div>${escapeHtml(entry.matchedRuleName || 'passThrough')}</div>
            <div>${escapeHtml(entry.appliedAction || 'passThrough')}</div>
            <div class="footer-actions"><button class="btn" data-full-create-from-request="${entry.id}">Create rule</button></div>
          </div>
        `).join('') : '<div class="empty">No requests captured yet.</div>'}
      </div>
    </section>
  `
}
