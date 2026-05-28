import { escapeHtml, truncate, relativeTime } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { getRuleState } from '../../shared/rule-state.js'
import { formatShowingCount } from '../../shared/ui/count.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderRuleActionBadge, renderRuleStateBadge } from '../../shared/ui/rule-status.js'
import { renderTooltipAttrs } from '../../shared/ui/tooltip.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
}

function displayMethod(method) {
  return method === 'ANY' ? t('common.all') : method
}

function actionBadge(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') return renderRuleActionBadge({ actionType: type, label: `${t('rules.actionLabels.mock')} ${rule.action?.statusCode || 200}` })
  if (type === 'failRequest') return renderRuleActionBadge({ actionType: type, label: t('rules.actionLabels.fail') })
  if (type === 'delayOnly') return renderRuleActionBadge({ actionType: type, label: `${t('rules.actionLabels.delay')} ${rule.action?.delayMs || 0}ms` })
  return renderRuleActionBadge({ actionType: type, label: t('rules.actionLabels.pass') })
}

function stateBadge(rule) {
  const state = getRuleState(rule)
  const label = t(`rules.states.${state}`)
  return renderRuleStateBadge({
    state,
    label,
    data: { 'rule-state': rule.id }
  })
}

function hitsCell(rule) {
  const count = Number(rule.diagnostics?.matchCount || 0)
  const last = rule.diagnostics?.lastMatchedAt
  let tooltip = ''
  if (last) {
    const rel = relativeTime(last)
    if (rel) {
      tooltip = t('rules.lastMatched', {
        relative: t(rel.key, { value: rel.value ?? 0 })
      })
    }
  } else {
    tooltip = t('rules.lastMatchedNever')
  }
  return `<span class="rule-hits-cell" data-rule-hit="${rule.id}" ${renderTooltipAttrs(tooltip)}>${count}</span>`
}

function iconBtn({ icon: iconName, label, action, ruleId, danger = false }) {
  const cls = `icon-btn${danger ? ' danger' : ''}`
  return `<button class="${cls}" type="button" data-full-rule-${action}="${ruleId}" ${renderTooltipAttrs(label)} aria-label="${escapeHtml(label)}">${icon(iconName)}</button>`
}

export function renderRulesPage(state) {
  const activeCollectionId = state.settings?.activeCollectionId
  const search = String(state.rulesSearch || '').trim().toLowerCase()
  const collectionRules = state.rules.filter(rule => !activeCollectionId || rule.collectionId === activeCollectionId)
  const rules = collectionRules.filter(rule => {
    if (activeCollectionId && rule.collectionId !== activeCollectionId) return false
    if (!search) return true
    const hay = `${rule.name || ''} ${rule.match?.urlPattern || ''} ${rule.match?.method || ''}`.toLowerCase()
    return hay.includes(search)
  })
  const options = state.collections.map(collection => `<option value="${collection.id}" ${collection.id === activeCollectionId ? 'selected' : ''}>${escapeHtml(displayCollectionName(collection))}</option>`).join('')

  const header = `
    <div class="table-row row-rule rules-header" role="row">
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
      <select class="select filter-medium" id="full-rules-collection">${options}</select>
      <input class="input filter-grow" id="full-rules-search" placeholder="${escapeHtml(t('rules.searchPlaceholder'))}" value="${escapeHtml(state.rulesSearch || '')}" />
    </div>
  `
  const bodyHtml = `
    <div class="table table-wide" role="table">
          ${rules.length ? header : ''}
          ${rules.length ? rules.map(rule => {
          const urlPattern = rule.match?.urlPattern || ''
          return `
            <div class="table-row row-rule ${rule.diagnostics?.lastError ? 'row-error' : ''}" role="row">
              <div class="cell-rule">
                <strong ${renderTooltipAttrs(rule.name)}>${escapeHtml(truncate(rule.name, 60))}</strong>
                ${urlPattern ? `<span class="cell-rule-url" ${renderTooltipAttrs(urlPattern)}>${escapeHtml(truncate(urlPattern, 80))}</span>` : ''}
              </div>
              <div>
                <label class="status-toggle" ${renderTooltipAttrs(rule.enabled ? t('rules.states.disabled') : t('rules.states.ready'))}>
                  <input type="checkbox" data-full-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-label="${escapeHtml(t('common.enabled'))}" />
                  <span class="status-toggle-track" aria-hidden="true"></span>
                </label>
              </div>
              <div class="cell-method">${escapeHtml(displayMethod(rule.match?.method || 'ANY'))}</div>
              <div>${actionBadge(rule)}</div>
              <div>${stateBadge(rule)}</div>
              <div class="col-hits">${hitsCell(rule)}</div>
              <div class="row-actions col-actions data-panel__actions-cell">
                ${iconBtn({ icon: 'edit', label: t('common.edit'), action: 'edit', ruleId: rule.id })}
                ${iconBtn({ icon: 'copy', label: t('common.copyJson'), action: 'copy', ruleId: rule.id })}
                ${iconBtn({ icon: 'download', label: t('common.exportJson'), action: 'export', ruleId: rule.id })}
                ${iconBtn({ icon: 'trash', label: t('common.delete'), action: 'delete', ruleId: rule.id, danger: true })}
              </div>
            </div>
          `
          }).join('') : `<div class="empty">${escapeHtml(t('rules.noRules'))}</div>`}
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
        footerHtml: footerCount ? `<span class="data-panel__count">${escapeHtml(footerCount)}</span>` : '',
        className: 'rules-data-panel'
      })}
    </section>
  `
}
