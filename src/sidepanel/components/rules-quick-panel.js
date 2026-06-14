import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { hasActiveCaptureContext } from '../../shared/capture-context.js'
import { getRuleState } from '../../shared/rule-state.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderImportTemplateMenu } from '../../shared/ui/import-template-menu.js'
import { renderRuleActionBadge, renderRuleStateDot } from '../../shared/ui/rule-status.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'
import { renderTooltipAttrs } from '../../shared/ui/tooltip.js'
import { renderSelect } from '../../shared/ui/select.js'
import { renderPresetPicker } from '../../fullapp/components/preset-picker.js'

const LABEL_TOOLTIP_DELAY_MS = 700

function renderTruncatedTooltipAttrs(text, size) {
  const value = String(text || '')
  if (!value || value.length <= size) return ''
  return renderTooltipAttrs(value, { delayMs: LABEL_TOOLTIP_DELAY_MS })
}

function actionBadge(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') {
    return renderRuleActionBadge({
      actionType: type,
      statusCode: rule.action?.statusCode || 200,
      label: `${t('badges.mock')} ${rule.action?.statusCode || 200}`
    })
  }
  if (type === 'failRequest') return renderRuleActionBadge({ actionType: type, label: t('badges.fail') })
  if (type === 'delayOnly') return renderRuleActionBadge({ actionType: type, label: t('badges.delay') })
  return renderRuleActionBadge({ actionType: type, label: t('badges.pass') })
}

function methodOptionLabel(method) {
  return method === 'ANY' ? t('common.all') : method
}

function makeOptions(values, selectedLabel) {
  return values.map(value => ({
    value,
    label: typeof selectedLabel === 'function' ? selectedLabel(value) : value
  }))
}

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

export function renderRulesQuickPanel(state) {
  const captureActive = hasActiveCaptureContext(state)
  const selectableCollections = state.collections.filter(collection => collection.enabled !== false)
  const preferredCollectionId = state.settings?.activeCollectionId
  const activeCollectionId = selectableCollections.some(collection => collection.id === preferredCollectionId)
    ? preferredCollectionId
    : selectableCollections[0]?.id || ''
  const collectionOptions = selectableCollections.map(collection => ({ value: collection.id, label: displayCollectionName(collection) }))
  const rules = state.rules.filter(rule => rule.collectionId === activeCollectionId)
  const text = state.rulesFilter?.toLowerCase() || ''
  const filtered = rules.filter(rule => {
    const hay = `${rule.name} ${rule.match?.urlPattern || ''} ${rule.match?.method || 'ANY'}`.toLowerCase()
    return !text || hay.includes(text)
  })
  const countText = rules.length
    ? formatShowingCount({
      shown: filtered.length,
      total: rules.length,
      singular: t('rules.entityOne'),
      plural: t('rules.entityMany')
    })
    : ''

  return `
    <div class="card compact-card sticky-filters rules-panel">
      <div class="sticky-bar rules-sticky-bar">
        <div class="row space-between rules-head">
          <h2>${t('rules.title')}</h2>
          <div class="rules-head-actions">
            ${renderImportTemplateMenu({ id: 'side-templates-menu', dataName: 'template-action' })}
            <button class="btn primary" id="quick-new-rule-btn">${t('rules.newRule')}</button>
          </div>
        </div>
        <div class="rules-collection-row">
          <div class="rules-collection-select">
            ${renderSelect({ id: 'active-collection-select', value: activeCollectionId, options: collectionOptions })}
          </div>
          <button class="icon-btn ghost" type="button" id="manage-collections-btn" ${renderTooltipAttrs(t('common.manage'))} aria-label="${escapeHtml(t('common.manage'))}">${icon('settings')}</button>
        </div>
        <input class="input" id="rules-search" placeholder="${t('rules.searchPlaceholder')}" value="${escapeHtml(state.rulesFilter || '')}" />
        ${countText ? `
          <div class="rules-quick-meta">
            <span class="small rules-results-count">${escapeHtml(countText)}</span>
          </div>
        ` : ''}
      </div>
      <div class="list">
        ${filtered.length ? filtered.map(rule => {
          const state = getRuleState(rule, { captureActive })
          const stateLabel = t(`rules.states.${state}`)
          const ruleName = rule.name || ''
          const ruleMethod = methodOptionLabel(rule.match?.method || 'ANY')
          const ruleUrlPattern = rule.match?.urlPattern || ''
          const ruleMeta = `${ruleMethod} · ${ruleUrlPattern}`
          return `
          <div class="item ${rule.diagnostics?.lastError ? 'rule-error' : ''}">
            <div class="item-title">
              <label class="status-toggle">
                <input type="checkbox" data-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-label="${escapeHtml(rule.enabled ? t('common.enabled') : t('common.disabled'))}" />
                <span class="status-toggle-track" aria-hidden="true"></span>
              </label>
              ${renderRuleStateDot({ state, label: stateLabel, data: { 'rule-state': rule.id } })}
              <span class="rule-hits-badge" data-rule-hit="${rule.id}">${Number(rule.diagnostics?.matchCount || 0)}</span>
              ${actionBadge(rule)}
            </div>
            <strong ${renderTruncatedTooltipAttrs(ruleName, 48)}>${escapeHtml(truncate(ruleName, 48))}</strong>
            <div class="item-meta" ${renderTruncatedTooltipAttrs(ruleMeta, 64)}>${escapeHtml(ruleMethod)} · ${escapeHtml(truncate(ruleUrlPattern, 64))}</div>
            <div class="row-actions">
              <button class="icon-btn ghost" type="button" data-rule-edit="${rule.id}" ${renderTooltipAttrs(t('common.edit'))} aria-label="${escapeHtml(t('common.edit'))}">${icon('edit')}</button>
              <button class="icon-btn ghost" type="button" data-rule-copy="${rule.id}" ${renderTooltipAttrs(t('common.copyJson'))} aria-label="${escapeHtml(t('common.copyJson'))}">${icon('copy')}</button>
              <button class="icon-btn ghost" type="button" data-rule-export="${rule.id}" ${renderTooltipAttrs(t('common.exportJson'))} aria-label="${escapeHtml(t('common.exportJson'))}">${icon('download')}</button>
              <button class="icon-btn danger" type="button" data-rule-delete="${rule.id}" ${renderTooltipAttrs(t('common.delete'))} aria-label="${escapeHtml(t('common.delete'))}">${icon('trash')}</button>
              <button class="btn info" data-rule-advanced="${rule.id}">${t('common.advanced')} ${icon('external', 12)}</button>
            </div>
          </div>
          `
        }).join('') : `<div class="empty">${t('rules.noRules')}</div>`}
      </div>
      <div class="sidepanel-list-footer is-centered">
        <button class="link-btn" id="quick-open-advanced-hint">${t('rules.advancedEditor')}</button>
      </div>
    </div>
  `
}

export function renderQuickRuleEditor(state) {
  if (!state.quickRuleEditorOpen) return ''
  const form = state.quickRuleForm
  const methodOptions = makeOptions(['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], methodOptionLabel)
  const matchTypeOptions = makeOptions(['contains', 'equals'])
  const actionTypeOptions = makeOptions(['mockResponse', 'failRequest', 'delayOnly', 'passThrough'])
  const bodyHtml = `
    ${renderPresetPicker({ compact: true })}
    <div class="column">
      <label class="switch"><input type="checkbox" id="quick-enabled" ${form.enabled ? 'checked' : ''}/> ${t('common.enabled')}</label>
      <input class="input" id="quick-name" placeholder="${t('rules.ruleName')}" value="${escapeHtml(form.name)}" />
      ${renderSelect({ id: 'quick-method', value: form.match.method, options: methodOptions })}
      ${renderSelect({ id: 'quick-match-type', value: form.match.matchType, options: matchTypeOptions })}
      <input class="input" id="quick-url" placeholder="/api/user" value="${escapeHtml(form.match.urlPattern)}" />
      ${renderSelect({ id: 'quick-action-type', value: form.action.type, options: actionTypeOptions })}
      <input class="input" id="quick-status" type="number" placeholder="${t('rules.statusCode')}" value="${escapeHtml(form.action.statusCode)}" />
      <input class="input" id="quick-delay" type="number" placeholder="${t('rules.delayMs')}" value="${escapeHtml(form.action.delayMs)}" />
      <textarea class="textarea" id="quick-body">${escapeHtml(form.action.responseBody)}</textarea>
    </div>
  `
  const footerHtml = `
    <button class="btn" id="quick-editor-cancel">${t('common.cancel')}</button>
    <button class="btn info" id="quick-open-advanced">${t('rules.advanced')}</button>
    <button class="btn primary" id="quick-save-rule">${t('common.save')}</button>
  `

  return renderModalShell({
    title: form.id ? t('rules.editRule') : t('rules.createRule'),
    titleTag: 'h2',
    bodyHtml,
    footerHtml,
    closeId: 'quick-editor-close-x',
    closeLabel: t('common.close'),
    footerClassName: 'footer-actions'
  })
}
