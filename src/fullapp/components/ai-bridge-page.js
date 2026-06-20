import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderSwitch } from '../../shared/ui/toggle.js'
import { AI_BRIDGE_STATUS, buildAiBridgeMcpConfigText, normalizeAiBridgeSessionState } from '../../shared/ai-bridge-state.js'
import {
  AI_BRIDGE_PERMISSION_MODES,
  createSessionAiBridgePermissions,
  getAiBridgeDefaultPermissionMode,
  getAiBridgeSessionPermissionMode,
  normalizeAiBridgeDefaultPermissions,
  normalizeAiBridgeSessionPermissions
} from '../../shared/ai-bridge-permissions.js'

const DATA_PERMISSION_ROWS = [
  ['allowQueryValuesByDefault', 'allowQueryValuesThisSession', 'aiBridgePermissionQueryValues'],
  ['allowRequestHeadersByDefault', 'allowRequestHeadersThisSession', 'aiBridgePermissionRequestHeaders'],
  ['allowResponseHeadersByDefault', 'allowResponseHeadersThisSession', 'aiBridgePermissionResponseHeaders'],
  ['allowRequestBodyByDefault', 'allowRequestBodyThisSession', 'aiBridgePermissionRequestBody'],
  ['allowResponseBodyByDefault', 'allowResponseBodyThisSession', 'aiBridgePermissionResponseBody'],
  ['allowDetailedLogsByDefault', 'allowDetailedLogsThisSession', 'aiBridgePermissionDetailedLogs']
]

const ACTION_PERMISSION_ROWS = [
  ['allowImportBundleApplyByDefault', 'allowImportBundleApplyThisSession', 'aiBridgePermissionImportApply'],
  ['allowRuleActionsByDefault', 'allowRuleActionsThisSession', 'aiBridgePermissionRuleActions'],
  ['allowCapturedTabReloadByDefault', 'allowCapturedTabReloadThisSession', 'aiBridgePermissionCapturedTabReload']
]

const ALL_PERMISSION_ROWS = [...DATA_PERMISSION_ROWS, ...ACTION_PERMISSION_ROWS]

function statusLabel(status) {
  if (status === AI_BRIDGE_STATUS.connected) return t('fullapp.aiBridgeStatusConnected')
  if (status === AI_BRIDGE_STATUS.waiting) return t('fullapp.aiBridgeStatusWaiting')
  return t('fullapp.aiBridgeStatusDisabled')
}

function permissionIdSuffix(key) {
  return key
    .replace('ByDefault', '')
    .replace('ThisSession', '')
    .replace(/^[A-Z]/, char => char.toLowerCase())
    .replace(/[A-Z]/g, char => `-${char.toLowerCase()}`)
}

function countEnabled(permissions = {}, keys = []) {
  return keys.filter(key => permissions[key]).length
}

function permissionsEqual(a = {}, b = {}) {
  return JSON.stringify(normalizeAiBridgeSessionPermissions(a)) === JSON.stringify(normalizeAiBridgeSessionPermissions(b))
}

function getSessionSummary(session, defaultPermissions) {
  if (session.status === AI_BRIDGE_STATUS.disabled) return t('fullapp.aiBridgeSessionSummaryNone')
  const expected = createSessionAiBridgePermissions(defaultPermissions)
  return permissionsEqual(session.permissions, expected)
    ? t('fullapp.aiBridgeSessionSummaryDefault')
    : t('fullapp.aiBridgeSessionSummaryCustom')
}

function getSensitiveDataSummary(permissions = {}) {
  const total = DATA_PERMISSION_ROWS.length
  const enabled = countEnabled(permissions, DATA_PERMISSION_ROWS.map(([, sessionKey]) => sessionKey))
  if (!enabled) return t('fullapp.aiBridgeSensitiveDataHidden')
  if (enabled === total) return t('fullapp.aiBridgeSensitiveDataReleased')
  return t('fullapp.aiBridgeSensitiveDataPartial')
}

function getActionSummary(permissions = {}) {
  const total = ACTION_PERMISSION_ROWS.length
  const enabled = countEnabled(permissions, ACTION_PERMISSION_ROWS.map(([, sessionKey]) => sessionKey))
  if (!enabled) return t('fullapp.aiBridgeActionsNone')
  if (enabled === total) return t('fullapp.aiBridgeActionsAll')
  return t('fullapp.aiBridgeActionsSome')
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

function renderSummaryItem(label, value) {
  return `
    <div class="ai-bridge-summary-item">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `
}

function renderPermissionSwitches(rows, permissions, mode) {
  return rows.map(([defaultKey, sessionKey, labelKey]) => {
    const key = mode === 'session' ? sessionKey : defaultKey
    return renderSwitch({
      id: `ai-bridge-${mode}-${permissionIdSuffix(key)}`,
      checked: Boolean(permissions[key]),
      label: t(`fullapp.${labelKey}`),
      className: 'settings-toggle ai-bridge-permission-toggle',
      attrs: {
        [`data-ai-bridge-${mode}-permission`]: key
      }
    })
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

function renderStatusSection(session) {
  const enabled = session.status !== AI_BRIDGE_STATUS.disabled
  const configText = buildAiBridgeMcpConfigText(session)
  return `
    <section class="ai-bridge-page__section ai-bridge-page__status">
      <div class="ai-bridge-page__section-header">
        <div>
          <h3>${escapeHtml(t('fullapp.aiBridgeConnectionTitle'))}</h3>
          <p>${escapeHtml(t('fullapp.aiBridgeDescription'))}</p>
        </div>
        <span class="badge" data-state="${escapeHtml(session.status)}">${escapeHtml(statusLabel(session.status))}</span>
      </div>
      <p class="ai-bridge-page__notice">${escapeHtml(enabled ? t('fullapp.aiBridgeBetaNotice') : t('fullapp.aiBridgeDisabledNotice'))}</p>
      <div class="ai-bridge-page__actions">
        ${enabled
          ? renderButton({ id: 'settings-ai-bridge-revoke-btn', label: t('fullapp.aiBridgeRevokeSession'), variant: 'secondary' })
          : renderButton({ id: 'settings-ai-bridge-start-btn', label: t('fullapp.aiBridgeStartSession'), variant: 'secondary' })}
        ${enabled ? renderButton({ id: 'settings-ai-bridge-copy-config-btn', label: t('fullapp.aiBridgeCopyConfig'), variant: 'secondary' }) : ''}
      </div>
      ${configText
        ? `<pre class="ai-bridge-page__config" id="settings-ai-bridge-config">${escapeHtml(configText)}</pre>`
        : ''}
    </section>
  `
}

function renderPresetSummary(permissions, mode) {
  return `
    <div class="ai-bridge-preset-summary">
      <p>${escapeHtml(t(`fullapp.aiBridgeMode${mode[0].toUpperCase()}${mode.slice(1)}Summary`))}</p>
      <div class="ai-bridge-summary-grid">
        ${renderSummaryItem(t('fullapp.aiBridgeSensitiveDataSummary'), getSensitiveDataSummary(permissions))}
        ${renderSummaryItem(t('fullapp.aiBridgeActionSummary'), getActionSummary(permissions))}
      </div>
      ${mode === AI_BRIDGE_PERMISSION_MODES.advanced
        ? `<p class="ai-bridge-page__warning">${escapeHtml(t('fullapp.aiBridgeAdvancedModeWarning'))}</p>`
        : ''}
      ${renderButton({ id: 'ai-bridge-edit-custom-permissions-btn', label: t('fullapp.aiBridgeEditCustomPermissions'), variant: 'secondary' })}
    </div>
  `
}

function renderSessionPermissions(session, defaultPermissions, effectiveMode, options = {}) {
  if (session.status === AI_BRIDGE_STATUS.disabled) {
    return `<p class="ai-bridge-page__muted">${escapeHtml(t('fullapp.aiBridgeSessionPermissionsUnavailable'))}</p>`
  }

  const permissions = normalizeAiBridgeSessionPermissions(session.permissions)
  return `
    <div class="ai-bridge-session-permissions">
      <div class="ai-bridge-session-permissions__header">
        <strong>${escapeHtml(getSessionSummary(session, defaultPermissions))}</strong>
        <div class="ai-bridge-page__actions">
          ${renderButton({ id: 'ai-bridge-session-customize-btn', label: t('fullapp.aiBridgeCustomizeSession'), variant: 'secondary' })}
          ${renderButton({ id: 'ai-bridge-session-reset-btn', label: t('fullapp.aiBridgeRestoreSessionDefaults'), variant: 'secondary' })}
        </div>
      </div>
      ${effectiveMode === AI_BRIDGE_PERMISSION_MODES.custom
        ? `
          ${renderPermissionGroup(t('fullapp.aiBridgePermissionDataGroup'), DATA_PERMISSION_ROWS, permissions, 'session')}
          ${renderPermissionGroup(t('fullapp.aiBridgePermissionActionsGroup'), ACTION_PERMISSION_ROWS, permissions, 'session')}
        `
        : ''}
    </div>
  `
}

function renderAdvancedPermissions(session, settings, options = {}) {
  const defaultPermissions = normalizeAiBridgeDefaultPermissions(settings.aiBridgePermissions)
  const sessionPermissions = normalizeAiBridgeSessionPermissions(session.permissions)
  const effectiveMode = getEffectiveMode(session, defaultPermissions, options)
  const activePermissions = session.status === AI_BRIDGE_STATUS.disabled
    ? createSessionAiBridgePermissions(defaultPermissions)
    : sessionPermissions
  const openAttr = options.advancedOpen ? ' open' : ''
  return `
    <details class="ai-bridge-page__advanced"${openAttr}>
      <summary id="ai-bridge-advanced-toggle">${escapeHtml(t('fullapp.aiBridgeAdvancedPermissionsToggle'))}</summary>
      <div class="ai-bridge-page__advanced-body">
        <section class="ai-bridge-page__permission-block">
          <div class="ai-bridge-page__section-header">
            <div>
              <h3>${escapeHtml(session.status === AI_BRIDGE_STATUS.disabled ? t('fullapp.aiBridgeDefaultPermissionsTitle') : t('fullapp.aiBridgeActiveModeTitle'))}</h3>
              <p>${escapeHtml(session.status === AI_BRIDGE_STATUS.disabled ? t('fullapp.aiBridgeDefaultPermissionsShortDescription') : t('fullapp.aiBridgeActiveModeDescription'))}</p>
            </div>
          </div>
          ${effectiveMode === AI_BRIDGE_PERMISSION_MODES.custom && session.status === AI_BRIDGE_STATUS.disabled
            ? `
              <p class="ai-bridge-page__warning">${escapeHtml(t('fullapp.aiBridgePermissionsWarning'))}</p>
              ${renderPermissionGroup(t('fullapp.aiBridgePermissionDataGroup'), DATA_PERMISSION_ROWS, defaultPermissions, 'default')}
              ${renderPermissionGroup(t('fullapp.aiBridgePermissionActionsGroup'), ACTION_PERMISSION_ROWS, defaultPermissions, 'default')}
            `
            : renderPresetSummary(activePermissions, effectiveMode)}
        </section>
        <section class="ai-bridge-page__permission-block">
          <div class="ai-bridge-page__section-header">
            <div>
              <h3>${escapeHtml(t('fullapp.aiBridgeSessionPermissionsTitle'))}</h3>
              <p>${escapeHtml(t('fullapp.aiBridgeSessionPermissionsDescription'))}</p>
            </div>
          </div>
          ${renderSessionPermissions(session, defaultPermissions, effectiveMode, options)}
        </section>
      </div>
    </details>
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
        ${renderStatusSection(session)}
        <section class="ai-bridge-page__section">
          <div class="ai-bridge-page__section-header">
            <div>
              <h3>${escapeHtml(t('fullapp.aiBridgePermissionModeTitle'))}</h3>
            </div>
          </div>
          ${renderModeCards(effectiveMode)}
        </section>
        ${renderAdvancedPermissions(session, state.settings || {}, options)}
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
