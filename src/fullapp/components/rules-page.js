import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { hasActiveCaptureContext } from '../../shared/capture-context.js'
import { getRuleState } from '../../shared/rule-state.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderRuleActionBadge, renderRuleStateBadge } from '../../shared/ui/rule-status.js'
import { renderTooltipAttrs } from '../../shared/ui/tooltip.js'
import { renderSelect } from '../../shared/ui/select.js'
import { renderCheckbox } from '../../shared/ui/checkbox.js'
import { renderFloatingSelectionBar } from '../../shared/ui/floating-selection-bar.js'

const LABEL_TOOLTIP_DELAY_MS = 700

function renderTruncatedTooltipAttrs(text, size) {
  const value = String(text || '')
  if (!value || value.length <= size) return ''
  return renderTooltipAttrs(value, { delayMs: LABEL_TOOLTIP_DELAY_MS })
}

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

function displayMethod(method) {
  return method === 'ANY' ? t('common.all') : method
}

function actionBadge(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') return renderRuleActionBadge({ actionType: type, statusCode: rule.action?.statusCode || 200, label: `${t('rules.actionLabels.mock')} ${rule.action?.statusCode || 200}` })
  if (type === 'failRequest') return renderRuleActionBadge({ actionType: type, label: t('rules.actionLabels.fail') })
  if (type === 'delayOnly') return renderRuleActionBadge({ actionType: type, label: `${t('rules.actionLabels.delay')} ${rule.action?.delayMs || 0}ms` })
  return renderRuleActionBadge({ actionType: type, label: t('rules.actionLabels.pass') })
}

function stateBadge(rule, captureActive) {
  const state = getRuleState(rule, { captureActive })
  const label = t(`rules.states.${state}`)
  return renderRuleStateBadge({
    state,
    label,
    data: { 'rule-state': rule.id }
  })
}

function hitsCell(rule) {
  const count = Number(rule.diagnostics?.matchCount || 0)
  return `<span class="rule-hits-cell" data-rule-hit="${rule.id}">${count}</span>`
}

function iconBtn({ icon: iconName, label, action, ruleId, danger = false }) {
  const cls = `icon-btn${danger ? ' danger' : ''}`
  return `<button class="${cls}" type="button" data-full-rule-${action}="${ruleId}" ${renderTooltipAttrs(label)} aria-label="${escapeHtml(label)}">${icon(iconName)}</button>`
}

export function renderRulesPage(state) {
  const captureActive = hasActiveCaptureContext(state)
  const selectableCollections = state.collections.filter(collection => collection.enabled !== false)
  const preferredCollectionId = state.settings?.activeCollectionId
  const activeCollectionId = selectableCollections.some(collection => collection.id === preferredCollectionId)
    ? preferredCollectionId
    : selectableCollections[0]?.id || ''
  const search = String(state.rulesSearch || '').trim().toLowerCase()
  const collectionRules = activeCollectionId
    ? state.rules.filter(rule => rule.collectionId === activeCollectionId)
    : []
  const rules = collectionRules.filter(rule => {
    if (activeCollectionId && rule.collectionId !== activeCollectionId) return false
    if (!search) return true
    const hay = `${rule.name || ''} ${rule.match?.urlPattern || ''} ${rule.match?.method || ''}`.toLowerCase()
    return hay.includes(search)
  })
  const options = selectableCollections.map(collection => ({ value: collection.id, label: displayCollectionName(collection) }))

  const header = `
    <div class="table-row row-rule rules-header" role="row">
      <div role="columnheader" class="col-select">
        ${renderCheckbox({ id: 'full-rules-select-all', data: { 'full-rules-select-all': true }, ariaLabel: t('common.selectAll') })}
      </div>
      <div role="columnheader">${escapeHtml(t('rules.columns.rule'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.status'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.method'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.action'))}</div>
      <div role="columnheader">${escapeHtml(t('rules.columns.state'))}</div>
      <div role="columnheader" class="col-hits">${escapeHtml(t('rules.columns.hits'))}</div>
      <div role="columnheader" class="col-actions data-panel__actions-cell">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `

  const filtersHtml = `
    <div class="toolbar">
      ${renderSelect({ id: 'full-rules-collection', value: activeCollectionId, options, className: 'filter-medium' })}
      <input class="input filter-grow" id="full-rules-search" placeholder="${escapeHtml(t('rules.searchPlaceholder'))}" value="${escapeHtml(state.rulesSearch || '')}" />
    </div>
  `
  const rowsHtml = rules.length ? rules.map(rule => {
    const urlPattern = rule.match?.urlPattern || ''
    return `
      <div class="table-row row-rule ${rule.diagnostics?.lastError ? 'row-error' : ''}" role="row">
        <div class="col-select">
          ${renderCheckbox({ data: { 'full-rule-select': rule.id }, ariaLabel: t('rules.selectRule') })}
        </div>
        <div class="cell-rule">
          <strong ${renderTruncatedTooltipAttrs(rule.name, 60)}>${escapeHtml(truncate(rule.name, 60))}</strong>
          ${urlPattern ? `<span class="cell-rule-url" ${renderTruncatedTooltipAttrs(urlPattern, 80)}>${escapeHtml(truncate(urlPattern, 80))}</span>` : ''}
        </div>
        <div>
          <label class="status-toggle">
            <input type="checkbox" data-full-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-label="${escapeHtml(rule.enabled ? t('common.enabled') : t('common.disabled'))}" />
            <span class="status-toggle-track" aria-hidden="true"></span>
          </label>
        </div>
        <div class="cell-method">${escapeHtml(displayMethod(rule.match?.method || 'ANY'))}</div>
        <div>${actionBadge(rule)}</div>
        <div>${stateBadge(rule, captureActive)}</div>
        <div class="col-hits">${hitsCell(rule)}</div>
        <div class="row-actions col-actions data-panel__actions-cell">
          ${iconBtn({ icon: 'edit', label: t('common.edit'), action: 'edit', ruleId: rule.id })}
          ${iconBtn({ icon: 'copy', label: t('common.copyJson'), action: 'copy', ruleId: rule.id })}
          ${iconBtn({ icon: 'download', label: t('common.exportJson'), action: 'export', ruleId: rule.id })}
          ${iconBtn({ icon: 'trash', label: t('common.delete'), action: 'delete', ruleId: rule.id, danger: true })}
        </div>
      </div>
    `
  }).join('') : `<div class="empty">${escapeHtml(t('rules.noRules'))}</div>`
  const bodyHtml = `
    <div class="data-table data-table--rules" role="table">
      ${rules.length ? `<div class="data-table__header table table-wide">${header}</div>` : ''}
      <div class="data-table__rows table table-wide">
        ${rowsHtml}
      </div>
    </div>
  `

  const footerCount = collectionRules.length
    ? formatShowingCount({
      shown: rules.length,
      total: collectionRules.length,
      singular: t('rules.entityOne'),
      plural: t('rules.entityMany')
    })
    : ''

  return `
    <section class="split-page rules-page">
      ${renderDataPanel({
        title: t('rules.title'),
        actionsHtml: `
          <button class="btn primary" id="full-new-rule-btn">${escapeHtml(t('fullapp.newRule'))}</button>
        `,
        filtersHtml,
        bodyHtml,
        overlayHtml: renderFloatingSelectionBar({
          id: 'full-rules-selection-bar',
          label: `0 ${t('rules.entityMany')} ${t('common.selectedMany')}`,
          clearLabel: t('common.clear'),
          deleteLabel: t('common.delete'),
          clearId: 'full-clear-selected-rules-btn',
          deleteId: 'full-delete-selected-rules-btn'
        }),
        footerHtml: footerCount ? `<span class="data-panel__count">${escapeHtml(footerCount)}</span>` : '',
        className: 'rules-data-panel',
        scrollClassName: 'data-panel__scroll--table'
      })}
    </section>
  `
}
