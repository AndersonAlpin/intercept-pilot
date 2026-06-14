import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'
import { renderSelect } from '../../shared/ui/select.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderRuleMoveModal({ open = false, collections = [], activeCollectionId = '', selectedCount = 0 } = {}) {
  if (!open) return ''

  const options = collections
    .filter(collection => collection.enabled !== false && collection.id !== activeCollectionId)
    .map(collection => ({ value: collection.id, label: displayCollectionName(collection) }))
  const hasDestination = options.length > 0
  const bodyHtml = `
    <div class="rule-move-modal__body">
      <p class="dialog-message">${escapeHtml(t('rules.moveSelectedMessage', { count: selectedCount }))}</p>
      <label class="settings-field">
        <span class="muted">${escapeHtml(t('rules.moveTargetCollection'))}</span>
        ${renderSelect({
          id: 'full-move-rules-target',
          value: options[0]?.value || '',
          options,
          disabled: !hasDestination,
          placeholder: hasDestination ? null : t('rules.moveNoDestination')
        })}
      </label>
    </div>
  `
  const footerHtml = `
    ${renderButton({ id: 'full-move-rules-cancel', label: t('common.cancel') })}
    ${renderButton({
      id: 'full-move-rules-confirm',
      label: t('rules.moveSelectedConfirm'),
      variant: 'primary',
      disabled: !hasDestination
    })}
  `

  return renderModalShell({
    title: t('rules.moveSelectedTitle'),
    bodyHtml,
    footerHtml,
    closeId: 'full-move-rules-close',
    closeLabel: t('common.close'),
    dialogClassName: 'rule-move-modal',
    footerClassName: 'footer-actions',
    attrs: {
      'data-rule-move-backdrop': 'true'
    }
  })
}
