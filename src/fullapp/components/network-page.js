import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function hasActiveFilter(state) {
  const f = state.networkFilter
  return Boolean(f.url || f.method !== 'ANY' || f.status || f.interceptedOnly)
}

export function isRenderableNetworkEntry(entry) {
  const method = String(entry?.method || '').trim()
  const url = String(entry?.url || '').trim()
  return Boolean(method || url)
}

function getAppliedRuleLabel(entry) {
  return entry?.matchedRuleName ? entry.matchedRuleName : t('network.noRule')
}

function getResultLabel(entry) {
  const action = String(entry?.appliedAction || 'passThrough')
  if (action === 'mockResponse') return t('network.resultMock200', { status: String(entry?.status || 200) })
  if (action === 'delayOnly') return t('network.resultDelay')
  if (action === 'failRequest') return t('network.resultFail')
  return t('network.resultPassThrough')
}

export function renderNetworkRows(state) {
  const entries = (state.filteredNetworkEntries || state.networkEntries).filter(isRenderableNetworkEntry)
  if (!entries.length) {
    const key = hasActiveFilter(state) ? 'network.noResults' : 'network.noRequests'
    return `<div class="empty">${escapeHtml(t(key))}</div>`
  }
  const header = `
    <div class="table-row row-network rules-header" role="row">
      <div role="columnheader">${escapeHtml(t('common.method'))}</div>
      <div role="columnheader">URL</div>
      <div role="columnheader">${escapeHtml(t('common.status'))}</div>
      <div role="columnheader">TYPE</div>
      <div role="columnheader">${escapeHtml(t('network.appliedRule'))}</div>
      <div role="columnheader">${escapeHtml(t('network.result'))}</div>
      <div role="columnheader" class="col-actions">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `
  const rows = entries.map(entry => `
    <div class="table-row row-network clickable-row"
         data-entry-id="${entry.id}"
         ${state.selectedNetworkEntryId === entry.id ? 'data-selected="true"' : ''}>
      <div>${escapeHtml(entry.method || '—')}</div>
      <div class="cell-network-url" title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</div>
      <div>${escapeHtml(String(entry.status ?? '—'))}</div>
      <div>${escapeHtml(entry.resourceType || '')}</div>
      <div>${escapeHtml(getAppliedRuleLabel(entry))}</div>
      <div>${escapeHtml(getResultLabel(entry))}</div>
      <div class="footer-actions"><button class="btn" data-full-create-from-request="${entry.id}">${t('network.createRule')}</button></div>
    </div>
  `).join('')
  return `${header}${rows}`
}

export function renderNetworkPage(state) {
  const total = state.networkEntries.filter(isRenderableNetworkEntry).length
  const filtered = state.filteredNetworkEntries?.length ?? total
  const countText = t('network.resultsCount', { filtered, total })

  return `
    <section class="split-page network-page">
      <section class="card filters-card network-filters-card">
        <div class="filters-row">
          <input class="input" id="full-network-url" placeholder="${t('network.filterUrl')}" value="${escapeHtml(state.networkFilter.url || '')}" />
          <select class="select" id="full-network-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(m => `<option value="${m}" ${state.networkFilter.method === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
          <input class="input" id="full-network-status" placeholder="${t('network.filterStatus')}" value="${escapeHtml(state.networkFilter.status || '')}" />
          <label class="switch"><input type="checkbox" id="full-network-intercepted" ${state.networkFilter.interceptedOnly ? 'checked' : ''}/> ${t('network.interceptedOnly')}</label>
          <button class="btn" id="full-network-clear">${t('common.clear')}</button>
          <span class="results-count" id="full-network-count">${escapeHtml(countText)}</span>
        </div>
      </section>
      <section class="card data-card network-data-card">
        <div class="table table-wide" id="full-network-table">
          ${renderNetworkRows(state)}
        </div>
      </section>
    </section>
  `
}
