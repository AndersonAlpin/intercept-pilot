import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE } from '../../shared/export.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'

function getProposalTypeLabel(type) {
  if (type === BUNDLE_TYPE_COLLECTION) return t('fullapp.aiImportTypeCollection')
  if (type === BUNDLE_TYPE_RULE) return t('fullapp.aiImportTypeRule')
  return t('common.unknown')
}

function getBundleRule(bundle) {
  if (bundle?.type !== BUNDLE_TYPE_RULE) return null
  return bundle.rule || null
}

function getBundleRules(bundle) {
  if (Array.isArray(bundle?.rules)) return bundle.rules
  if (Array.isArray(bundle?.collection?.rules)) return bundle.collection.rules
  return []
}

function getRuleMethod(rule) {
  return rule?.match?.method || rule?.method || ''
}

function getRulePattern(rule) {
  return rule?.match?.urlPattern || rule?.match?.url || rule?.urlPattern || ''
}

function getRuleActionSummary(rule) {
  const action = rule?.action || {}
  const type = action.type || ''
  const statusCode = action.statusCode || action.status || ''
  if (!type && !statusCode) return ''
  return [type, statusCode].filter(Boolean).join(' ')
}

function renderSummaryRow(label, value) {
  if (value === undefined || value === null || value === '') return ''
  return `
    <div class="ai-bridge-proposal-modal__row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
    </div>
  `
}

function getPendingImportSummary(pendingImport) {
  const summary = pendingImport.summary || {}
  const bundle = pendingImport.bundle || {}
  const type = summary.type || bundle.type
  const rule = getBundleRule(bundle)
  const rules = getBundleRules(bundle)
  const name = summary.collectionName || summary.ruleName || bundle.collection?.name || rule?.name || t('common.unknown')
  const ruleCount = summary.ruleCount ?? rules.length

  return {
    type,
    name,
    ruleCount,
    method: getRuleMethod(rule),
    pattern: getRulePattern(rule),
    action: getRuleActionSummary(rule)
  }
}

export function renderAiBridgeProposalModal(pendingImport) {
  if (!pendingImport?.id) return ''

  const summary = getPendingImportSummary(pendingImport)
  const isCollection = summary.type === BUNDLE_TYPE_COLLECTION
  const rows = [
    renderSummaryRow(t('fullapp.aiImportSource'), pendingImport.source || 'AI Bridge'),
    renderSummaryRow(t('fullapp.aiImportType'), getProposalTypeLabel(summary.type)),
    renderSummaryRow(t('fullapp.aiImportName'), summary.name),
    isCollection ? renderSummaryRow(t('fullapp.aiImportRuleCount'), summary.ruleCount) : '',
    !isCollection ? renderSummaryRow(t('fullapp.aiProposalModalMethod'), summary.method) : '',
    !isCollection ? renderSummaryRow(t('fullapp.aiProposalModalEndpoint'), summary.pattern) : '',
    !isCollection ? renderSummaryRow(t('fullapp.aiProposalModalAction'), summary.action) : ''
  ].join('')

  const bodyHtml = `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
    <a class="ai-bridge-proposal-modal__details" id="full-ai-proposal-import-details-link" href="?page=import">
      ${escapeHtml(t('fullapp.aiProposalModalViewDetails'))}
    </a>
  `
  const footerHtml = `
    ${renderButton({ id: 'full-ai-proposal-cancel-btn', label: t('fullapp.aiImportCancel'), variant: 'secondary' })}
    ${renderButton({ id: 'full-ai-proposal-confirm-btn', label: t('fullapp.aiProposalModalConfirm'), variant: 'primary' })}
  `

  return renderModalShell({
    title: t('fullapp.aiImportProposalTitle'),
    bodyHtml,
    footerHtml,
    className: 'ai-bridge-proposal-modal-backdrop',
    dialogClassName: 'ai-bridge-proposal-modal',
    bodyClassName: 'ai-bridge-proposal-modal__body',
    footerClassName: 'footer-actions ai-bridge-proposal-modal__footer',
    closeId: 'full-ai-proposal-close',
    closeLabel: t('fullapp.aiImportCancel'),
    attrs: {
      'data-ai-bridge-proposal-modal': 'true',
      'data-ai-proposal-backdrop': 'true'
    }
  })
}
