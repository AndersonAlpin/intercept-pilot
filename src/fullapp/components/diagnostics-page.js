import { escapeHtml } from '../../shared/utils.js'

export function renderDiagnosticsPage(state) {
  const invalidRules = state.rules.filter(rule => (rule.diagnostics?.lastError || '').length > 0)
  return `
    <section class="card">
      <h3>Diagnostics</h3>
      <div class="grid two">
        <div><strong>isAttached</strong><div>${state.attachedTabId ? 'true' : 'false'}</div></div>
        <div><strong>attachedTabId</strong><div>${escapeHtml(String(state.attachedTabId ?? 'null'))}</div></div>
        <div><strong>attachedUrl</strong><div>${escapeHtml(state.activeTab?.url || '')}</div></div>
        <div><strong>activeCollectionId</strong><div>${escapeHtml(state.settings?.activeCollectionId || '')}</div></div>
        <div><strong>enabledRules</strong><div>${state.rules.filter(rule => rule.enabled).length}</div></div>
        <div><strong>invalidRules</strong><div>${invalidRules.length}</div></div>
      </div>
      <h4>Recent runtime logs</h4>
      <div class="list">
        ${state.logs.slice(0, 10).map(log => `<div class="item"><div class="item-title"><strong>${escapeHtml(log.message || '')}</strong><span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || 'info')}</span></div></div>`).join('') || '<div class="empty">No logs.</div>'}
      </div>
    </section>
  `
}
