import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { AI_BRIDGE_STATUS, buildAiBridgeMcpConfigText, normalizeAiBridgeSessionState } from '../../shared/ai-bridge-state.js'

function statusLabel(status) {
  if (status === AI_BRIDGE_STATUS.connected) return t('fullapp.aiBridgeStatusConnected')
  if (status === AI_BRIDGE_STATUS.waiting) return t('fullapp.aiBridgeStatusWaiting')
  return t('fullapp.aiBridgeStatusDisabled')
}

export function renderAiBridgeSettingsSection(session) {
  const state = normalizeAiBridgeSessionState(session)
  const enabled = state.status !== AI_BRIDGE_STATUS.disabled
  const configText = buildAiBridgeMcpConfigText(state)

  return `
    <section class="settings-ai-bridge" aria-labelledby="settings-ai-bridge-title">
      <div class="settings-ai-bridge__header">
        <div>
          <h3 id="settings-ai-bridge-title">${escapeHtml(t('fullapp.aiBridgeTitle'))}</h3>
          <p class="muted">${escapeHtml(t('fullapp.aiBridgeDescription'))}</p>
        </div>
        <span class="badge" data-state="${escapeHtml(state.status)}">${escapeHtml(statusLabel(state.status))}</span>
      </div>
      <p class="settings-ai-bridge__notice">${escapeHtml(enabled ? t('fullapp.aiBridgeBetaNotice') : t('fullapp.aiBridgeDisabledNotice'))}</p>
      <div class="settings-ai-bridge__actions">
        ${enabled
          ? renderButton({ id: 'settings-ai-bridge-revoke-btn', label: t('fullapp.aiBridgeRevokeSession'), variant: 'secondary' })
          : renderButton({ id: 'settings-ai-bridge-start-btn', label: t('fullapp.aiBridgeStartSession'), variant: 'secondary' })}
        ${enabled ? renderButton({ id: 'settings-ai-bridge-copy-config-btn', label: t('fullapp.aiBridgeCopyConfig'), variant: 'secondary' }) : ''}
      </div>
      ${configText
        ? `<pre class="settings-ai-bridge__config" id="settings-ai-bridge-config">${escapeHtml(configText)}</pre>`
        : ''}
    </section>
  `
}
