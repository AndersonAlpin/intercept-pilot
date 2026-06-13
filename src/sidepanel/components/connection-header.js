import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { getCapturedTab, getCaptureNewTabCandidate, getContextTab, getStartCandidateTab } from '../../shared/capture-tabs.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderTooltipAttrs } from '../../shared/ui/tooltip.js'

export function renderConnectionHeader(state) {
  const attachedTab = state.attachedTab || null
  const compatActiveTab = state.compatActiveTab || null
  const candidateTab = getStartCandidateTab(state)
  const captureTab = getCapturedTab(state)
  const captureActive = Boolean(captureTab)
  const contextTab = getContextTab(state)
  const lightCaptureActive = Boolean(compatActiveTab && !attachedTab)
  const newCandidate = getCaptureNewTabCandidate(state)
  const canStart = !captureActive && Boolean(candidateTab)
  const statusClass = state.attachBusy ? 'is-busy' : captureActive ? 'is-attached' : 'is-detached'
  const statusText = state.attachBusy
    ? t('status.connecting')
    : captureActive
      ? t('status.captureActiveTabNumber', { position: captureTab.position || '?' })
      : t('status.captureInactive')
  const title = contextTab ? (contextTab.title || t('status.noCapturableTab')) : t('status.noCapturableTab')
  const titleUrl = contextTab?.url || ''
  const canReload = captureActive || Boolean(candidateTab)

  return `
    <header class="header">
      <div class="header-top">
        <img class="brand-logo" src="../assets/brand/logo-horizontal.png" alt="InterceptPilot" />
        <button class="btn secondary btn-open" id="open-fullapp-btn">${t('common.open')}</button>
      </div>

      <div class="capture-context">
        <div class="capture-status-row">
          <p class="attach-status ${statusClass}">${escapeHtml(statusText)}</p>
          ${lightCaptureActive ? `
            <button
              type="button"
              class="capture-mode-badge"
              id="side-capture-mode-settings"
              ${renderTooltipAttrs(t('status.lightCaptureTooltip'))}
            >${escapeHtml(t('status.lightCaptureName'))}</button>
          ` : ''}
        </div>
        ${contextTab
          ? `<button class="tab-focus-link" id="side-focus-tab-btn" ${renderTooltipAttrs(titleUrl)}>${escapeHtml(truncate(title, 58))}</button>`
          : `<p class="tab-context-empty">${escapeHtml(title)}</p>`
        }
      </div>

      <div class="capture-actions">
        ${captureActive ? `
          <div class="capture-actions-main">
            <button class="btn secondary" id="reload-tab-btn" title="${escapeHtml(t('status.reloadPage'))}" aria-label="${escapeHtml(t('status.reloadPage'))}" ${(!canReload || state.attachBusy) ? 'disabled' : ''}>${t('common.reload')}</button>
            <button class="btn warning" id="attach-btn" data-tab-id="${escapeHtml(String(captureTab.id || ''))}" title="${escapeHtml(t('status.restartCapture'))}" aria-label="${escapeHtml(t('status.restartCapture'))}" ${state.attachBusy ? 'disabled' : ''}>${t('status.restartCaptureShort')}</button>
            <button class="btn danger" id="detach-btn" data-tab-id="${escapeHtml(String(captureTab.id || ''))}" title="${escapeHtml(t('status.stopCapture'))}" aria-label="${escapeHtml(t('status.stopCapture'))}" ${state.attachBusy ? 'disabled' : ''}>${t('status.stopCaptureShort')}</button>
          </div>
          ${newCandidate ? `
            <button class="btn secondary capture-new-tab-btn" id="attach-new-tab-btn" data-tab-id="${escapeHtml(String(newCandidate.id || ''))}" title="${escapeHtml(t('status.captureNewTab'))}" aria-label="${escapeHtml(t('status.captureNewTab'))}" ${state.attachBusy ? 'disabled' : ''}>${t('status.captureNewTab')}</button>
          ` : ''}
        ` : `
          ${renderButton({
            id: 'attach-btn',
            label: state.attachBusy ? t('status.connecting') : t('status.startCapture'),
            variant: 'primary',
            className: 'capture-start-btn',
            data: { 'tab-id': candidateTab?.id || '' },
            disabled: !canStart || state.attachBusy,
            tooltip: !canStart ? t('status.noCapturableTab') : ''
          })}
        `}
      </div>
    </header>
  `
}
