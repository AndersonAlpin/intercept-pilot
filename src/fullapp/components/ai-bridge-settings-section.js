import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'

export function renderAiBridgeSettingsSection() {
  return `
    <section class="settings-ai-bridge" aria-labelledby="settings-ai-bridge-title">
      <div class="settings-ai-bridge__header">
        <div>
          <h3 id="settings-ai-bridge-title">${escapeHtml(t('fullapp.aiBridgeTitle'))}</h3>
          <p class="muted">${escapeHtml(t('fullapp.aiBridgeSettingsShortcutDescription'))}</p>
        </div>
      </div>
      <div class="settings-ai-bridge__actions">
        ${renderButton({ id: 'settings-ai-bridge-open-btn', label: t('fullapp.aiBridgeOpenPage'), variant: 'secondary' })}
      </div>
    </section>
  `
}
