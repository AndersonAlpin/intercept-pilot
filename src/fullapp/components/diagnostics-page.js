import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function normalizeLogScope(scope) {
  return String(scope || '').toLowerCase() === 'web' ? 'web' : 'app'
}

export function renderDiagnosticsPage(state) {
  const invalidRules = state.rules.filter(rule => (rule.diagnostics?.lastError || '').length > 0)
  const enabledRules = state.rules.filter(rule => rule.enabled).length
  const appLogs = state.logs.filter(log => normalizeLogScope(log.scope) === 'app')
  const recentAppLogs = appLogs.slice(0, 12)
  const attachedTabIdLabel = state.attachedTabId == null ? '—' : String(state.attachedTabId)
  const attachedUrlLabel = String(state.attachedTab?.url || '').trim() || '—'
  const activeCollectionIdLabel = String(state.settings?.activeCollectionId || '').trim() || '—'
  return `
    <section class="card">
      <h3>${t('common.diagnostics')}</h3>
      <div class="grid two">
        <div><strong>${t('fullapp.isAttached')}</strong><div>${state.attachedTabId ? t('common.yes') : t('common.no')}</div></div>
        <div><strong>${t('fullapp.attachedTabId')}</strong><div>${escapeHtml(attachedTabIdLabel)}</div></div>
        <div><strong>${t('fullapp.attachedUrl')}</strong><div>${escapeHtml(attachedUrlLabel)}</div></div>
        <div><strong>${t('diagnostics.activeCollectionId')}</strong><div>${escapeHtml(activeCollectionIdLabel)}</div></div>
        <div><strong>${t('fullapp.enabledRules')}</strong><div>${enabledRules}</div></div>
        <div><strong>${t('fullapp.invalidRules')}</strong><div>${invalidRules.length}</div></div>
      </div>
      <div class="footer-actions">
        <button class="btn" data-page="logs">${t('diagnostics.openWebLogs')}</button>
      </div>
      <h4>${t('diagnostics.extensionEvents')}</h4>
      <div class="list">
        ${recentAppLogs.map(log => `
          <div class="item">
            <div class="item-title">
              <strong>${escapeHtml(log.message || '')}</strong>
              <span class="badge ${log.level === 'error' ? 'danger' : log.level === 'warn' ? 'warning' : 'success'}">${escapeHtml(log.level || t('badges.info'))}</span>
            </div>
            <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
            ${log.url ? `<div class="item-meta">${escapeHtml(log.url)}</div>` : ''}
          </div>
        `).join('') || `<div class="empty">${t('diagnostics.noExtensionLogs')}</div>`}
      </div>
    </section>
  `
}
