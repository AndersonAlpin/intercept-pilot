import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE } from '../../shared/export.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'
import { renderBadge } from '../../shared/ui/badge.js'

const MAX_DIFF_LINES = 3

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

function renderSourceBadge() {
  return `
    ${renderBadge({
      label: 'AI Bridge',
      variant: 'contrast',
      className: 'ai-bridge-proposal-modal__source-badge'
    })}
  `
}

function strong(value) {
  return `<strong>${escapeHtml(String(value ?? ''))}</strong>`
}

function renderTemplate(key, values = {}, strongKeys = []) {
  const tokens = {}
  const tokenValues = {}
  for (const [name, value] of Object.entries(values)) {
    const token = `__AI_BRIDGE_${name.toUpperCase()}__`
    tokens[name] = token
    tokenValues[name] = value
  }

  let html = escapeHtml(t(key, tokens))
  for (const [name, token] of Object.entries(tokens)) {
    html = html.replaceAll(escapeHtml(token), strongKeys.includes(name) ? strong(tokenValues[name]) : escapeHtml(String(tokenValues[name] ?? '')))
  }
  return html
}

function renderTemplateLine(key, values = {}, strongKeys = []) {
  return { html: renderTemplate(key, values, strongKeys) }
}

function renderMessageLine(line) {
  if (line?.html) return line.html
  return escapeHtml(String(line || ''))
}

function renderMessageItem(item) {
  if (!item) return ''
  if (item?.block) return item.html
  return `<p>${renderMessageLine(item)}</p>`
}

function renderMessage(lines = []) {
  return `
    ${renderSourceBadge()}
    <div class="dialog-message ai-bridge-proposal-modal__message">
      ${lines.filter(Boolean).map(renderMessageItem).join('')}
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
  const lines = isCollection
    ? [
      renderTemplateLine('fullapp.aiImportCollectionLead', { name: summary.name }, ['name']),
      renderTemplateLine('fullapp.aiImportCollectionRuleImpact', { count: summary.ruleCount }, ['count'])
    ]
    : [
      renderTemplateLine('fullapp.aiImportRuleLead', { name: summary.name }, ['name']),
      summary.method || summary.pattern ? renderTemplateLine('fullapp.aiImportRuleMatchSummary', {
        method: summary.method || t('common.unknown'),
        pattern: summary.pattern || t('common.unknown')
      }, ['method', 'pattern']) : '',
      summary.action ? renderTemplateLine('fullapp.aiImportRuleActionSummary', { action: summary.action }, ['action']) : ''
    ]

  return renderMessage(lines)
}

function renderActionProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const isSetOnlyActiveRule = pendingAction.action === 'set_only_active_rule'
  const lines = [
    renderTemplateLine(`fullapp.aiActionLead_${pendingAction.action}`, { rule: summary.ruleName || t('common.unknown') }, ['rule']),
    summary.collectionName && !isSetOnlyActiveRule ? renderTemplateLine('fullapp.aiActionCollectionLine', { collection: summary.collectionName }, ['collection']) : '',
    isSetOnlyActiveRule ? renderTemplateLine('fullapp.aiActionSetOnlyActiveRuleImpact', {
      count: Number(summary.affectedRuleCount || 0),
      collection: summary.collectionName || t('common.unknown')
    }, ['count', 'collection']) : ''
  ]

  return renderMessage(lines)
}

function renderSetActiveCollectionProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  return renderMessage([
    renderTemplateLine('fullapp.aiActionLead_set_active_collection', { collection: summary.collectionName || t('common.unknown') }, ['collection']),
    summary.previousCollectionName ? renderTemplateLine('fullapp.aiActionPreviousCollectionLine', { collection: summary.previousCollectionName }, ['collection']) : ''
  ])
}

function renderReloadProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const target = [summary.origin, summary.path].filter(Boolean).join('')

  return renderMessage([
    t('fullapp.aiActionLead_reload_captured_tab'),
    target ? {
      html: `${escapeHtml(t('fullapp.aiActionReloadTarget'))}: <strong>${escapeHtml(target)}</strong>.`
    } : ''
  ])
}

function formatDiffBlock(diff = []) {
  const safeDiff = Array.isArray(diff) ? diff : []
  const visible = safeDiff.slice(0, MAX_DIFF_LINES).map(item => {
    const field = String(item?.field || t('common.unknown'))
    const before = String(item?.before ?? '')
    const after = String(item?.after ?? '')
    return `
      <div class="ai-bridge-proposal-modal__diff-item">
        <div class="ai-bridge-proposal-modal__diff-field">${escapeHtml(field)}</div>
        <div class="ai-bridge-proposal-modal__diff-values">
          <span>${escapeHtml(t('fullapp.aiActionDiffBefore'))}: ${strong(before)}</span>
          <span>${escapeHtml(t('fullapp.aiActionDiffAfter'))}: ${strong(after)}</span>
        </div>
      </div>
    `
  })
  const remaining = safeDiff.length - visible.length
  if (remaining > 0) {
    visible.push(`<p class="ai-bridge-proposal-modal__diff-more">${escapeHtml(t('fullapp.aiActionDiffMoreLine', { count: remaining }))}</p>`)
  }
  if (!visible.length) return ''
  return {
    block: true,
    html: `<div class="ai-bridge-proposal-modal__diff">${visible.join('')}</div>`
  }
}

function renderEditProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const isRule = pendingAction.action === 'update_rule'
  const lines = [
    isRule
      ? renderTemplateLine('fullapp.aiActionLead_update_rule', { rule: summary.ruleName || t('common.unknown') }, ['rule'])
      : renderTemplateLine('fullapp.aiActionLead_update_collection', { collection: summary.collectionName || t('common.unknown') }, ['collection']),
    summary.collectionName && isRule ? renderTemplateLine('fullapp.aiActionCollectionLine', { collection: summary.collectionName }, ['collection']) : '',
    summary.reason ? renderTemplateLine('fullapp.aiActionReasonLine', { reason: summary.reason }) : '',
    formatDiffBlock(summary.diff)
  ]

  return renderMessage(lines)
}

function renderDeleteProposalBody(pendingAction) {
  const summary = pendingAction.summary || {}
  const isCollectionDelete = pendingAction.action === 'delete_collection'
  const targetName = isCollectionDelete ? summary.collectionName : summary.ruleName
  const ruleCount = Number(summary.affectedRuleCount || 0)
  const lines = isCollectionDelete
    ? [
      renderTemplateLine('fullapp.aiActionDeleteCollectionLead', {
        name: targetName || t('common.unknown'),
        count: ruleCount
      }, ['name', 'count']),
      t('fullapp.aiActionDeleteWarning')
    ]
    : [
      renderTemplateLine('fullapp.aiActionDeleteRuleLead', {
        rule: targetName || t('common.unknown'),
        collection: summary.collectionName || t('common.unknown')
      }, ['rule', 'collection']),
      t('fullapp.aiActionDeleteWarning')
    ]
  return renderMessage(lines)
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
