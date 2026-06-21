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

function getRuleActionLabel(action) {
  if (action === 'enable_rule') return t('fullapp.aiActionTypeEnableRule')
  if (action === 'disable_rule') return t('fullapp.aiActionTypeDisableRule')
  if (action === 'set_only_active_rule') return t('fullapp.aiActionTypeSetOnlyActiveRule')
  if (action === 'set_active_collection') return t('fullapp.aiActionTypeSetActiveCollection')
  if (action === 'update_rule') return t('fullapp.aiActionTypeUpdateRule')
  if (action === 'update_collection') return t('fullapp.aiActionTypeUpdateCollection')
  if (action === 'delete_rule') return t('fullapp.aiActionTypeDeleteRule')
  if (action === 'delete_collection') return t('fullapp.aiActionTypeDeleteCollection')
  if (action === 'reload_captured_tab') return t('fullapp.aiActionTypeReloadCapturedTab')
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

function renderImportProposalBody(pendingImport) {
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

  return `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
    <a class="ai-bridge-proposal-modal__details" id="full-ai-proposal-import-details-link" href="?page=import">
      ${escapeHtml(t('fullapp.aiProposalModalViewDetails'))}
    </a>
  `
}

function renderActionProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const isSetOnlyActiveRule = pendingAction.action === 'set_only_active_rule'
  const affectedNames = Array.isArray(summary.affectedRules)
    ? summary.affectedRules.map(rule => rule.name).filter(Boolean).join(', ')
    : ''
  const rows = [
    renderSummaryRow(t('fullapp.aiImportSource'), pendingAction.source || 'AI Bridge'),
    renderSummaryRow(t('fullapp.aiActionType'), getRuleActionLabel(pendingAction.action)),
    renderSummaryRow(t('fullapp.aiActionRule'), summary.ruleName),
    renderSummaryRow(t('fullapp.aiActionCollection'), summary.collectionName),
    renderSummaryRow(t('fullapp.aiActionImpact'), t(`fullapp.aiActionImpact_${pendingAction.action}`)),
    isSetOnlyActiveRule ? renderSummaryRow(t('fullapp.aiActionAffectedRuleCount'), summary.affectedRuleCount) : '',
    isSetOnlyActiveRule ? renderSummaryRow(t('fullapp.aiActionAffectedRules'), affectedNames) : ''
  ].join('')

  return `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
  `
}

function renderSetActiveCollectionProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const rows = [
    renderSummaryRow(t('fullapp.aiActionPreviousCollection'), summary.previousCollectionName),
    renderSummaryRow(t('fullapp.aiActionNextCollection'), summary.collectionName),
    renderSummaryRow(t('fullapp.aiActionImpact'), t('fullapp.aiActionImpact_set_active_collection'))
  ].join('')

  return `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
  `
}

function renderReloadProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const target = [summary.origin, summary.path].filter(Boolean).join('')
  const rows = [
    renderSummaryRow(t('fullapp.aiImportSource'), pendingAction.source || 'AI Bridge'),
    renderSummaryRow(t('fullapp.aiActionType'), getRuleActionLabel(pendingAction.action)),
    renderSummaryRow(t('fullapp.aiActionReloadTarget'), target),
    renderSummaryRow(t('fullapp.aiActionImpact'), t('fullapp.aiActionImpact_reload_captured_tab'))
  ].join('')

  return `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
  `
}

function renderDiffRows(diff = []) {
  return diff.map(item => `
    <div class="ai-bridge-proposal-modal__row">
      <span>${escapeHtml(String(item?.field || ''))}</span>
      <strong>${escapeHtml(`${String(item?.before ?? '')} -> ${String(item?.after ?? '')}`)}</strong>
    </div>
  `).join('')
}

function renderEditProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const rows = [
    renderSummaryRow(t('fullapp.aiImportSource'), pendingAction.source || 'AI Bridge'),
    renderSummaryRow(t('fullapp.aiActionType'), getRuleActionLabel(pendingAction.action)),
    pendingAction.action === 'update_rule' ? renderSummaryRow(t('fullapp.aiActionRule'), summary.ruleName) : '',
    renderSummaryRow(t('fullapp.aiActionCollection'), summary.collectionName),
    renderSummaryRow(t('fullapp.aiActionReason'), summary.reason),
    renderDiffRows(Array.isArray(summary.diff) ? summary.diff : [])
  ].join('')

  return `
    <p class="ai-bridge-proposal-modal__notice">${escapeHtml(t('fullapp.aiProposalModalSafetyNotice'))}</p>
    <div class="ai-bridge-proposal-modal__grid">
      ${rows}
    </div>
  `
}

function renderDeleteProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const isCollectionDelete = pendingAction.action === 'delete_collection'
  const targetName = isCollectionDelete ? summary.collectionName : summary.ruleName
  const ruleCount = Number(summary.affectedRuleCount || 0)
  const lead = isCollectionDelete
    ? t('fullapp.aiActionDeleteCollectionLead', { name: targetName || t('common.unknown'), count: ruleCount })
    : t('fullapp.aiActionDeleteRuleLead', {
      rule: targetName || t('common.unknown'),
      collection: summary.collectionName || t('common.unknown')
    })
  const source = pendingAction.source || 'AI Bridge'

  return `
    <p class="dialog-message">${escapeHtml(`${lead}\n${t('fullapp.aiActionDeleteWarning')}`)}</p>
    <p class="ai-bridge-proposal-modal__source">${escapeHtml(t('fullapp.aiActionProposalSource', { source }))}</p>
  `
}

export function renderAiBridgeProposalModal(proposal) {
  const pendingAction = proposal?.pendingAction || (proposal?.action ? proposal : null)
  const pendingImport = proposal?.pendingImport || (!pendingAction ? proposal : null)
  if (!pendingAction?.id && !pendingImport?.id) return ''

  const isAction = Boolean(pendingAction?.id)
  const isReload = isAction && pendingAction.action === 'reload_captured_tab'
  const isSetActiveCollection = isAction && pendingAction.action === 'set_active_collection'
  const isEdit = isAction && ['update_rule', 'update_collection'].includes(pendingAction.action)
  const isDelete = isAction && ['delete_rule', 'delete_collection'].includes(pendingAction.action)
  const bodyHtml = isReload
    ? renderReloadProposalBody(pendingAction)
    : isSetActiveCollection ? renderSetActiveCollectionProposalBody(pendingAction)
    : isEdit ? renderEditProposalBody(pendingAction)
    : isDelete ? renderDeleteProposalBody(pendingAction)
    : isAction ? renderActionProposalBody(pendingAction) : renderImportProposalBody(pendingImport)
  const title = isDelete
    ? t(pendingAction.action === 'delete_collection' ? 'collections.deleteTitle' : 'rules.deleteTitle')
    : isSetActiveCollection ? t('fullapp.aiActionTypeSetActiveCollection')
    : isAction ? t('fullapp.aiActionProposalTitle') : t('fullapp.aiImportProposalTitle')
  const confirmLabel = isDelete
    ? t(pendingAction.action === 'delete_collection' ? 'fullapp.aiActionConfirmDeleteCollection' : 'fullapp.aiActionConfirmDeleteRule')
    : isAction ? t('fullapp.aiActionConfirm') : t('fullapp.aiProposalModalConfirm')
  const footerHtml = `
    ${renderButton({ id: 'full-ai-proposal-cancel-btn', label: t('fullapp.aiImportCancel'), variant: 'secondary' })}
    ${renderButton({ id: 'full-ai-proposal-confirm-btn', label: confirmLabel, variant: isDelete ? 'danger' : 'primary' })}
  `

  return renderModalShell({
    title,
    bodyHtml,
    footerHtml,
    className: 'ai-bridge-proposal-modal-backdrop',
    dialogClassName: isDelete ? 'ai-bridge-proposal-modal dialog-modal dialog-modal-danger' : 'ai-bridge-proposal-modal',
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
