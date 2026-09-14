import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE } from '../../shared/export.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderImportTemplateMenu } from '../../shared/ui/import-template-menu.js'

function getAiImportTypeLabel(type) {
  if (type === BUNDLE_TYPE_COLLECTION) return t('fullapp.aiImportTypeCollection')
  if (type === BUNDLE_TYPE_RULE) return t('fullapp.aiImportTypeRule')
  return t('common.unknown')
}

function renderAiImportProposal(pendingImport) {
  if (!pendingImport?.id) return ''
  const summary = pendingImport.summary || {}
  const name = summary.collectionName || summary.ruleName || t('common.unknown')
  const conflict = summary.conflict
    ? `<div class="ai-import-proposal__row"><span>${escapeHtml(t('fullapp.aiImportConflict'))}</span><strong>${escapeHtml(summary.conflict.name || summary.conflict.id)}</strong></div>`
    : ''
  const ruleCount = summary.type === BUNDLE_TYPE_COLLECTION
    ? `<div class="ai-import-proposal__row"><span>${escapeHtml(t('fullapp.aiImportRuleCount'))}</span><strong>${escapeHtml(String(summary.ruleCount || 0))}</strong></div>`
    : ''

  return `
    <section class="ai-import-proposal" aria-labelledby="ai-import-proposal-title">
      <div class="ai-import-proposal__header">
        <div>
          <h4 id="ai-import-proposal-title">${escapeHtml(t('fullapp.aiImportProposalTitle'))}</h4>
          <p>${escapeHtml(t('fullapp.aiImportSafetyNotice'))}</p>
        </div>
        <span class="badge">${escapeHtml(pendingImport.source || 'AI Bridge')}</span>
      </div>
      <div class="ai-import-proposal__grid">
        <div class="ai-import-proposal__row"><span>${escapeHtml(t('fullapp.aiImportSource'))}</span><strong>${escapeHtml(pendingImport.source || 'AI Bridge')}</strong></div>
        <div class="ai-import-proposal__row"><span>${escapeHtml(t('fullapp.aiImportType'))}</span><strong>${escapeHtml(getAiImportTypeLabel(summary.type))}</strong></div>
        <div class="ai-import-proposal__row"><span>${escapeHtml(t('fullapp.aiImportName'))}</span><strong>${escapeHtml(name)}</strong></div>
        ${ruleCount}
        ${conflict}
      </div>
      <div class="ai-import-proposal__actions">
        ${renderButton({ id: 'full-ai-import-cancel-btn', label: t('fullapp.aiImportCancel'), variant: 'secondary' })}
        ${renderButton({ id: 'full-ai-import-confirm-btn', label: t('fullapp.aiImportConfirm'), variant: 'primary' })}
      </div>
    </section>
  `
}

export function renderImportExportPage(state) {
  const bodyHtml = `
    ${renderAiImportProposal(state.aiBridgePendingImport)}
    <div class="import-dropzone" id="full-import-dropzone" data-import-dropzone="true">
      <textarea class="textarea code import-json-input" id="full-import-json" placeholder="${escapeHtml(t('fullapp.importPlaceholder'))}"></textarea>
    </div>
    ${state.lastImportExportMessage ? `<pre class="preview">${escapeHtml(state.lastImportExportMessage)}</pre>` : ''}
  `

  return `
    ${renderDataPanel({
      title: t('navigation.importExport'),
      description: t('fullapp.importStrategy'),
      actionsHtml: `
        ${renderImportTemplateMenu({ id: 'full-import-templates-menu', dataName: 'import-template-action' })}
        ${renderButton({ id: 'full-import-pick-file-btn', label: t('fullapp.importPickFile'), variant: 'secondary', iconName: 'upload', iconPosition: 'start' })}
        <input type="file" id="full-import-file-input" accept="application/json,.json" hidden />
      `,
      bodyHtml,
      footerHtml: renderButton({
        id: 'full-import-json-btn',
        label: t('fullapp.importJson'),
        variant: 'primary',
        disabled: true,
        tooltip: t('fullapp.importJsonDisabled')
      }),
      className: 'import-export-panel',
      footerClassName: 'footer-actions'
    })}
  `
}
