import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderAttrs } from '../../shared/ui/dom.js'
import { AI_BRIDGE_STATUS, buildAiBridgeMcpConfigText, normalizeAiBridgeSessionState } from '../../shared/ai-bridge-state.js'
import {
  AI_BRIDGE_PERMISSION_MODES,
  getAiBridgeDefaultPermissionMode,
  getAiBridgeSessionPermissionMode,
  normalizeAiBridgeDefaultPermissions,
  normalizeAiBridgeSessionPermissions
} from '../../shared/ai-bridge-permissions.js'

const DATA_PERMISSION_ROWS = [
  ['allowQueryValuesByDefault', 'allowQueryValuesThisSession', 'aiBridgePermissionQueryValues', 'aiBridgePermissionQueryValuesDescription'],
  ['allowRequestHeadersByDefault', 'allowRequestHeadersThisSession', 'aiBridgePermissionRequestHeaders', 'aiBridgePermissionRequestHeadersDescription'],
  ['allowResponseHeadersByDefault', 'allowResponseHeadersThisSession', 'aiBridgePermissionResponseHeaders', 'aiBridgePermissionResponseHeadersDescription'],
  ['allowRequestBodyByDefault', 'allowRequestBodyThisSession', 'aiBridgePermissionRequestBody', 'aiBridgePermissionRequestBodyDescription'],
  ['allowResponseBodyByDefault', 'allowResponseBodyThisSession', 'aiBridgePermissionResponseBody', 'aiBridgePermissionResponseBodyDescription'],
  ['allowDetailedLogsByDefault', 'allowDetailedLogsThisSession', 'aiBridgePermissionDetailedLogs', 'aiBridgePermissionDetailedLogsDescription']
]

const ACTION_PERMISSION_ROWS = [
  ['allowImportBundleApplyByDefault', 'allowImportBundleApplyThisSession', 'aiBridgePermissionImportApply', 'aiBridgePermissionImportApplyDescription'],
  ['allowRuleActionsByDefault', 'allowRuleActionsThisSession', 'aiBridgePermissionRuleActions', 'aiBridgePermissionRuleActionsDescription'],
  ['allowDestructiveRuleCollectionActionsByDefault', 'allowDestructiveRuleCollectionActionsThisSession', 'aiBridgePermissionDestructiveActions', 'aiBridgePermissionDestructiveActionsDescription'],
  ['allowCaptureControlByDefault', 'allowCaptureControlThisSession', 'aiBridgePermissionCaptureControl', 'aiBridgePermissionCaptureControlDescription'],
  ['allowCapturedTabReloadByDefault', 'allowCapturedTabReloadThisSession', 'aiBridgePermissionCapturedTabReload', 'aiBridgePermissionCapturedTabReloadDescription']
]

const ALL_PERMISSION_ROWS = [...DATA_PERMISSION_ROWS, ...ACTION_PERMISSION_ROWS]

function statusLabel(status) {
  if (status === AI_BRIDGE_STATUS.connected) return t('fullapp.aiBridgeStatusConnected')
  if (status === AI_BRIDGE_STATUS.waiting) return t('fullapp.aiBridgeStatusWaiting')
  return t('fullapp.aiBridgeStatusDisabled')
}

function statusBadgeState(status) {
  if (status === AI_BRIDGE_STATUS.connected) return 'success'
  if (status === AI_BRIDGE_STATUS.waiting) return 'warning'
  return 'danger'
}

function statusNotice(status) {
  if (status === AI_BRIDGE_STATUS.connected) return t('fullapp.aiBridgeConnectedNotice')
  if (status === AI_BRIDGE_STATUS.waiting) return t('fullapp.aiBridgeWaitingNotice')
  return t('fullapp.aiBridgeDisabledNotice')
}

function permissionIdSuffix(key) {
  return key
    .replace('ByDefault', '')
    .replace('ThisSession', '')
    .replace(/^[A-Z]/, char => char.toLowerCase())
    .replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
}

function getEffectiveMode(session, defaultPermissions, options = {}) {
  if (session.status === AI_BRIDGE_STATUS.disabled) {
    if (options.defaultPermissionsOpen) return AI_BRIDGE_PERMISSION_MODES.custom
    return getAiBridgeDefaultPermissionMode(defaultPermissions)
  }
  if (options.sessionPermissionsOpen) return AI_BRIDGE_PERMISSION_MODES.custom
  return getAiBridgeSessionPermissionMode(session.permissions)
}

function renderModeCards(current) {
  return `
    <div class="ai-bridge-mode-grid">
      ${Object.values(AI_BRIDGE_PERMISSION_MODES).map(mode => `
        <button class="ai-bridge-mode-card ${current === mode ? 'is-active' : ''}" type="button" data-ai-bridge-mode="${escapeHtml(mode)}" aria-pressed="${current === mode ? 'true' : 'false'}">
          <strong>${escapeHtml(t(`fullapp.aiBridgeMode${mode[0].toUpperCase()}${mode.slice(1)}Title`))}</strong>
          <span>${escapeHtml(t(`fullapp.aiBridgeMode${mode[0].toUpperCase()}${mode.slice(1)}Description`))}</span>
        </button>
      `).join('')}
    </div>
  `
}

function renderPermissionSwitches(rows, permissions, mode) {
  return rows.map(([defaultKey, sessionKey, labelKey, descriptionKey]) => {
    const key = mode === 'session' ? sessionKey : defaultKey
    const id = `ai-bridge-${mode}-${permissionIdSuffix(key)}`
    const descriptionId = `${id}-description`
    const inputAttrs = renderAttrs({
      id,
      type: 'checkbox',
      checked: Boolean(permissions[key]),
      'aria-describedby': descriptionId,
      [`data-ai-bridge-${mode}-permission`]: key
    })
    return `
      <label class="ai-bridge-permission-item" for="${escapeHtml(id)}">
        <div class="ai-bridge-permission-item__copy">
          <strong>${escapeHtml(t(`fullapp.${labelKey}`))}</strong>
          <span id="${escapeHtml(descriptionId)}">${escapeHtml(t(`fullapp.${descriptionKey}`))}</span>
        </div>
        <span class="switch settings-toggle ai-bridge-permission-toggle">
          <input ${inputAttrs} />
          <span class="switch-track" aria-hidden="true"></span>
        </span>
      </label>
    `
  }).join('')
}

function renderPermissionGroup(title, rows, permissions, mode) {
  return `
    <div class="ai-bridge-permission-group">
      <h4>${escapeHtml(title)}</h4>
      <div class="ai-bridge-permission-list">
        ${renderPermissionSwitches(rows, permissions, mode)}
      </div>
    </div>
  `
}

function renderStatusSection(session, settings = {}, options = {}) {
  const enabled = session.status !== AI_BRIDGE_STATUS.disabled
  const key = String(settings.aiBridgeConnectionKey || '')
  const hasKey = Boolean(key)
  const configText = buildAiBridgeMcpConfigText({ key, port: session.port })
  const configVisible = hasKey && configText && options.configVisible
  return `
    <section class="ai-bridge-page__section ai-bridge-page__status">
      <div class="ai-bridge-page__section-header">
        <div>
          <h3>${escapeHtml(t('fullapp.aiBridgeConnectionTitle'))}</h3>
          <p>${escapeHtml(t('fullapp.aiBridgeDescription'))}</p>
        </div>
        <span class="badge ai-bridge-page__status-badge" data-state="${escapeHtml(statusBadgeState(session.status))}" data-ai-bridge-status="${escapeHtml(session.status)}">${escapeHtml(statusLabel(session.status))}</span>
      </div>
      <p class="ai-bridge-page__notice">${escapeHtml(statusNotice(session.status))}</p>
      <div class="ai-bridge-page__actions">
        ${enabled
          ? renderButton({ id: 'settings-ai-bridge-revoke-btn', label: t('fullapp.aiBridgeRevokeSession'), variant: 'secondary' })
          : renderButton({ id: 'settings-ai-bridge-start-btn', label: t('fullapp.aiBridgeStartSession'), variant: 'secondary' })}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-copy-config-btn', label: t('fullapp.aiBridgeCopyConfig'), variant: 'secondary' }) : ''}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-toggle-config-btn', label: t(configVisible ? 'fullapp.aiBridgeHideConfig' : 'fullapp.aiBridgeShowConfig'), variant: 'secondary' }) : ''}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-regenerate-key-btn', label: t('fullapp.aiBridgeRegenerateKey'), variant: 'secondary' }) : ''}
      </div>
      ${configVisible
        ? `
          <p class="ai-bridge-page__config-help">${escapeHtml(t('fullapp.aiBridgeConfigHelp'))}</p>
          <pre class="ai-bridge-page__config" id="settings-ai-bridge-config">${escapeHtml(configText)}</pre>
          <p class="ai-bridge-page__config-help">${escapeHtml(t('fullapp.aiBridgeDevConfigNote'))}</p>
        `
        : ''}
    </section>
  `
}

function renderAdvancedPermissions(session, settings) {
  const defaultPermissions = normalizeAiBridgeDefaultPermissions(settings.aiBridgePermissions)
  const hasSession = session.status !== AI_BRIDGE_STATUS.disabled
  const permissions = hasSession ? normalizeAiBridgeSessionPermissions(session.permissions) : defaultPermissions
  const mode = hasSession ? 'session' : 'default'

  return `
    <section class="ai-bridge-page__section ai-bridge-page__advanced-permissions">
      <div class="ai-bridge-page__section-header">
        <div>
          <h3>${escapeHtml(t('fullapp.aiBridgeAdvancedPermissionsTitle'))}</h3>
        </div>
      </div>
      ${renderPermissionGroup(t('fullapp.aiBridgePermissionDataGroup'), DATA_PERMISSION_ROWS, permissions, mode)}
      ${renderPermissionGroup(t('fullapp.aiBridgePermissionActionsGroup'), ACTION_PERMISSION_ROWS, permissions, mode)}
    </section>
  `
}

export function renderAiBridgePage(state = {}, options = {}) {
  const session = normalizeAiBridgeSessionState(state.aiBridgeSession)
  const defaultPermissions = normalizeAiBridgeDefaultPermissions(state.settings?.aiBridgePermissions)
  const effectiveMode = getEffectiveMode(session, defaultPermissions, options)

  return renderDataPanel({
    title: t('fullapp.aiBridgeTitle'),
    description: t('fullapp.aiBridgePageDescription'),
    bodyHtml: `
      <div class="ai-bridge-page">
        ${renderStatusSection(session, state.settings || {}, options)}
        <section class="ai-bridge-page__section">
          <div class="ai-bridge-page__section-header">
            <div>
              <h3>${escapeHtml(t('fullapp.aiBridgePermissionModeTitle'))}</h3>
            </div>
          </div>
          ${renderModeCards(effectiveMode)}
        </section>
        ${renderAdvancedPermissions(session, state.settings || {})}
      </div>
    `,
    className: 'ai-bridge-panel'
  })
}

export {
  ALL_PERMISSION_ROWS,
  DATA_PERMISSION_ROWS,
  ACTION_PERMISSION_ROWS
}
