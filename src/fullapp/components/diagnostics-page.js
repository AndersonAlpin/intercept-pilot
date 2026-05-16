import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderDiagnosticsPage(state) {
  const invalidRules = state.rules.filter(rule => (rule.diagnostics?.lastError || '').length > 0)
  return `
    <section class="card">
      <h3>${t('common.diagnostics')}</h3>
      <div class="grid two">
        <div><strong>${t('fullapp.isAttached')}</strong><div>${state.attachedTabId ? 'true' : 'false'}</div></div>
        <div><strong>${t('fullapp.attachedTabId')}</strong><div>${escapeHtml(String(state.attachedTabId ?? 'null'))}</div></div>
        <div><strong>${t('fullapp.attachedUrl')}</strong><div>${escapeHtml(state.attachedTab?.url || '')}</div></div>
        <div><strong>activeCollectionId</strong><div>${escapeHtml(state.settings?.activeCollectionId || '')}</div></div>
        <div><strong>${t('fullapp.enabledRules')}</strong><div>${state.rules.filter(rule => rule.enabled).length}</div></div>
        <div><strong>${t('fullapp.invalidRules')}</strong><div>${invalidRules.length}</div></div>
      </div>
      <h4>${t('fullapp.recentRuntimeLogs')}</h4>
      <div class="list">
        ${state.logs.slice(0, 10).map(log => `<div class="item"><div class="item-title"><strong>${escapeHtml(log.message || '')}</strong><span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || t('badges.info'))}</span></div></div>`).join('') || `<div class="empty">${t('fullapp.noLogs')}</div>`}
      </div>
    </section>
  `
}
