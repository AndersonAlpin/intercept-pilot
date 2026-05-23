import { escapeHtml, truncate, relativeTime } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { getRuleState } from '../../shared/rule-state.js'
import { renderRuleActionBadge, renderRuleStateBadge } from '../../shared/ui/rule-status.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || ''
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
  return `<span class="rule-hits-cell" data-rule-hit="${rule.id}" title="${escapeHtml(tooltip)}">${count}</span>`
}

function iconBtn({ icon: iconName, label, action, ruleId, danger = false }) {
  const cls = `icon-btn${danger ? ' danger' : ''}`
  return `<button class="${cls}" type="button" data-full-rule-${action}="${ruleId}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon(iconName)}</button>`
}

export function renderRulesPage(state) {
  const activeCollectionId = state.settings?.activeCollectionId
  const search = String(state.rulesSearch || '').trim().toLowerCase()
  const rules = state.rules.filter(rule => {
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
      <div role="columnheader" class="col-actions">${escapeHtml(t('rules.columns.actions'))}</div>
    </div>
  `

  return `
    <section class="split-page rules-page">
      <section class="card filters-card rules-filters-card">
        <div class="toolbar">
          <select class="select" id="full-rules-collection">${options}</select>
          <input class="input" id="full-rules-search" placeholder="${escapeHtml(t('rules.searchPlaceholder'))}" value="${escapeHtml(state.rulesSearch || '')}" />
          <button class="btn primary" id="full-new-rule-btn">${escapeHtml(t('fullapp.newRule'))}</button>
          <button class="btn" id="full-import-rule-btn">${escapeHtml(t('common.import'))}</button>
        </div>
      </section>
      <section class="card data-card rules-data-card">
        <div class="table table-wide" role="table">
          ${rules.length ? header : ''}
          ${rules.length ? rules.map(rule => {
          const urlPattern = rule.match?.urlPattern || ''
          return `
            <div class="table-row row-rule ${rule.diagnostics?.lastError ? 'row-error' : ''}" role="row">
              <div class="cell-rule">
                <strong title="${escapeHtml(rule.name)}">${escapeHtml(truncate(rule.name, 60))}</strong>
                ${urlPattern ? `<span class="cell-rule-url" title="${escapeHtml(urlPattern)}">${escapeHtml(truncate(urlPattern, 80))}</span>` : ''}
              </div>
              <div>
                <label class="status-toggle" title="${escapeHtml(rule.enabled ? t('rules.states.disabled') : t('rules.states.ready'))}">
                  <input type="checkbox" data-full-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-label="${escapeHtml(t('common.enabled'))}" />
                  <span class="status-toggle-track" aria-hidden="true"></span>
                </label>
              </div>
              <div class="cell-method">${escapeHtml(rule.match?.method || 'ANY')}</div>
              <div>${actionBadge(rule)}</div>
              <div>${stateBadge(rule)}</div>
              <div class="col-hits">${hitsCell(rule)}</div>
              <div class="row-actions col-actions">
                ${iconBtn({ icon: 'edit', label: t('common.edit'), action: 'edit', ruleId: rule.id })}
                ${iconBtn({ icon: 'copy', label: t('common.copyJson'), action: 'copy', ruleId: rule.id })}
                ${iconBtn({ icon: 'download', label: t('common.exportJson'), action: 'export', ruleId: rule.id })}
                ${iconBtn({ icon: 'trash', label: t('common.delete'), action: 'delete', ruleId: rule.id, danger: true })}
              </div>
            </div>
          `
          }).join('') : `<div class="empty">${escapeHtml(t('rules.noRules'))}</div>`}
        </div>
      </section>
    </section>
  `
}
