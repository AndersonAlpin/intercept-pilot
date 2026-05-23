import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { getCapturedTab } from '../../shared/capture-tabs.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'

function normalizeLogScope(scope) {
  return String(scope || '').toLowerCase() === 'web' ? 'web' : 'app'
}

export function renderDiagnosticsPage(state) {
  const invalidRules = state.rules.filter(rule => (rule.diagnostics?.lastError || '').length > 0)
  const enabledRules = state.rules.filter(rule => rule.enabled).length
  const appLogs = state.logs.filter(log => normalizeLogScope(log.scope) === 'app')
  const recentAppLogs = appLogs.slice(0, 12)
  const capturedTab = getCapturedTab(state)
  const attachedTabIdLabel = capturedTab?.id == null ? '—' : String(capturedTab.id)
  const attachedUrlLabel = String(capturedTab?.url || '').trim() || '—'
  const activeCollectionIdLabel = String(state.settings?.activeCollectionId || '').trim() || '—'
  const summaryHtml = `
    <div class="grid two diagnostics-summary-grid">
        <div><strong>${t('fullapp.isAttached')}</strong><div>${capturedTab ? t('common.yes') : t('common.no')}</div></div>
        <div><strong>${t('fullapp.attachedTabId')}</strong><div>${escapeHtml(attachedTabIdLabel)}</div></div>
        <div><strong>${t('fullapp.attachedUrl')}</strong><div>${escapeHtml(attachedUrlLabel)}</div></div>
        <div><strong>${t('diagnostics.activeCollectionId')}</strong><div>${escapeHtml(activeCollectionIdLabel)}</div></div>
        <div><strong>${t('fullapp.enabledRules')}</strong><div>${enabledRules}</div></div>
        <div><strong>${t('fullapp.invalidRules')}</strong><div>${invalidRules.length}</div></div>
      </div>
  `
  const eventsHtml = `
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
  `
  const eventsCount = formatShowingCount({
    shown: recentAppLogs.length,
    total: appLogs.length,
    singular: t('diagnostics.eventOne'),
    plural: t('diagnostics.eventMany')
  })

  return `
    <section class="split-page diagnostics-page">
      ${renderDataPanel({
        title: t('common.diagnostics'),
        actionsHtml: `<button class="btn info" data-page="logs">${t('diagnostics.openWebLogs')}</button>`,
        bodyHtml: summaryHtml,
        className: 'diagnostics-summary-panel'
      })}
      ${renderDataPanel({
        title: t('diagnostics.extensionEvents'),
        bodyHtml: eventsHtml,
        footerHtml: `<span class="data-panel__count">${escapeHtml(eventsCount)}</span>`,
        className: 'diagnostics-events-panel'
      })}
    </section>
  `
}
