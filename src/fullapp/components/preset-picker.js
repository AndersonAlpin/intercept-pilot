import { RULE_PRESETS } from '../../shared/presets.js'
import { t } from '../../shared/i18n.js'
import { escapeHtml } from '../../shared/utils.js'
import { icon } from '../../shared/icons.js'

export function renderPresetPicker(options = {}) {
  const compact = options.compact === true
  return `
    <div class="preset-picker ${compact ? 'preset-picker-compact' : ''}" role="group" aria-label="${escapeHtml(t('presets.pickerLabel'))}">
      ${compact ? '' : `<span class="preset-picker-label">${escapeHtml(t('presets.pickerLabel'))}</span>`}
      ${RULE_PRESETS.map(preset => `
        <button
          type="button"
          class="preset-chip"
          data-preset-apply="${preset.id}"
          title="${escapeHtml(t(preset.labelKey))}"
          aria-label="${escapeHtml(t(preset.labelKey))}">
          ${icon(preset.icon, 14)}
          ${compact ? '' : `<span>${escapeHtml(t(preset.labelKey))}</span>`}
        </button>
      `).join('')}
    </div>
  `
}
