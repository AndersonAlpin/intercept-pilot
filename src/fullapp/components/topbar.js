import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { getCapturedTab, getCaptureNewTabCandidate, getContextTab, getStartCandidateTab } from '../../shared/capture-tabs.js'
import { renderTooltipAttrs } from '../../shared/ui/tooltip.js'

export function renderTopbar(state) {
  const attachedTab = state.attachedTab || null
  const compatActiveTab = state.compatActiveTab || null
  const currentTab = getStartCandidateTab(state)
  const captureTab = getCapturedTab(state)
  const captureActive = Boolean(captureTab)
  const contextTab = getContextTab(state)
  const lightCaptureActive = Boolean(compatActiveTab && !attachedTab)
  const newCandidate = getCaptureNewTabCandidate(state)
  const autoAttachEnabled = Boolean(state.settings?.autoAttach)
  const statusText = captureActive
    ? t('status.captureActiveTabNumber', { position: captureTab?.position || '?' })
    : t('status.captureInactive')
  const primaryTitle = contextTab ? (contextTab.title || t('status.noCapturableTab')) : t('status.noCapturableTab')
  const primaryUrl = contextTab?.url || ''
  const canFocusTab = Boolean(contextTab?.id)
  const canStart = !captureActive && Boolean(currentTab)
  const canReload = captureActive || Boolean(currentTab)

  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${captureActive ? 'ok' : 'off'}"></span>
          <strong>${escapeHtml(statusText)}</strong>
          ${lightCaptureActive ? `
            <button
              type="button"
              class="capture-mode-badge"
              id="full-capture-mode-settings"
              ${renderTooltipAttrs(t('status.lightCaptureTooltip'))}
            >${escapeHtml(t('status.lightCaptureName'))}</button>
          ` : ''}
        </div>
        ${canFocusTab
          ? `<button class="tab-focus-link" id="full-focus-tab-btn" ${renderTooltipAttrs(primaryUrl)}>${escapeHtml(truncate(primaryTitle, 80))}</button>`
          : `<div class="muted">${escapeHtml(primaryTitle)}</div>`
        }
        ${autoAttachEnabled ? `<button class="auto-attach-link" id="full-open-auto-attach-settings" title="${escapeHtml(t('status.openAutoAttachSettings'))}" aria-label="${escapeHtml(t('status.openAutoAttachSettings'))}">${t('status.autoAttachActive')}</button>` : ''}
      </div>
      <div class="actions">
        ${captureActive
          ? `
            <button class="btn secondary" id="full-reload-btn" ${canReload ? '' : 'disabled'}>${t('common.reload')}</button>
            <button class="btn warning" id="full-attach-btn" data-tab-id="${escapeHtml(String(captureTab.id || ''))}">${t('status.restartCapture')}</button>
            <button class="btn danger" id="full-detach-btn" data-tab-id="${escapeHtml(String(captureTab.id || ''))}">${t('status.stopCapture')}</button>
            ${newCandidate ? `<button class="btn secondary" id="full-attach-new-tab-btn" data-tab-id="${escapeHtml(String(newCandidate.id || ''))}">${t('status.captureNewTab')}</button>` : ''}
          `
          : `
            <button class="btn primary" id="full-attach-btn" data-tab-id="${escapeHtml(String(currentTab?.id || ''))}" ${canStart ? '' : 'disabled'}>${t('status.startCapture')}</button>
          `}
      </div>
    </header>
  `
}
