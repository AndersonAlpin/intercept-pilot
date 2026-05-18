import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { getRuleState } from '../../shared/rule-state.js'
import { renderPresetPicker } from '../../fullapp/components/preset-picker.js'

function actionBadge(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') return `<span class="badge success">${t('badges.mock')} 200</span>`
  if (type === 'failRequest') return `<span class="badge danger">${t('badges.fail')}</span>`
  if (type === 'delayOnly') return `<span class="badge warning">${t('badges.delay')}</span>`
  return `<span class="badge">${t('badges.pass')}</span>`
}

export function renderRulesQuickPanel(state) {
  const activeCollectionId = state.settings?.activeCollectionId
  const rules = state.rules.filter(rule => rule.collectionId === activeCollectionId)
  const text = state.rulesFilter?.toLowerCase() || ''
  const filtered = rules.filter(rule => {
    const hay = `${rule.name} ${rule.match?.urlPattern || ''} ${rule.match?.method || 'ANY'}`.toLowerCase()
    return !text || hay.includes(text)
  })

  return `
    <div class="card compact-card">
      <div class="row space-between">
          <h2>${t('rules.title')}</h2>
          <button class="btn primary" id="quick-new-rule-btn">${t('rules.newRule')}</button>
        </div>
      <input class="input" id="rules-search" placeholder="${t('rules.searchPlaceholder')}" value="${escapeHtml(state.rulesFilter || '')}" />
      <div class="list">
        ${filtered.length ? filtered.map(rule => `
          <div class="item ${rule.diagnostics?.lastError ? 'rule-error' : ''}">
            <div class="item-title">
              <label class="status-toggle" title="${escapeHtml(rule.enabled ? t('rules.states.disabled') : t('rules.states.ready'))}">
                <input type="checkbox" data-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} aria-label="${escapeHtml(t('common.enabled'))}" />
                <span class="status-toggle-track" aria-hidden="true"></span>
              </label>
              <span class="rule-state-dot" data-rule-state="${rule.id}" data-state="${getRuleState(rule)}" title="${escapeHtml(t(`rules.states.${getRuleState(rule)}`))}"></span>
              <span class="rule-hits-badge" data-rule-hit="${rule.id}">${Number(rule.diagnostics?.matchCount || 0)}</span>
              ${actionBadge(rule)}
            </div>
            <strong>${escapeHtml(truncate(rule.name, 48))}</strong>
            <div class="item-meta">${escapeHtml(rule.match?.method || 'ANY')} · ${escapeHtml(truncate(rule.match?.urlPattern || '', 64))}</div>
            <div class="row-actions">
              <button class="icon-btn" type="button" data-rule-edit="${rule.id}" title="${escapeHtml(t('common.edit'))}" aria-label="${escapeHtml(t('common.edit'))}">${icon('edit')}</button>
              <button class="icon-btn" type="button" data-rule-copy="${rule.id}" title="${escapeHtml(t('common.copyJson'))}" aria-label="${escapeHtml(t('common.copyJson'))}">${icon('copy')}</button>
              <button class="icon-btn" type="button" data-rule-export="${rule.id}" title="${escapeHtml(t('common.exportJson'))}" aria-label="${escapeHtml(t('common.exportJson'))}">${icon('download')}</button>
              <button class="icon-btn danger" type="button" data-rule-delete="${rule.id}" title="${escapeHtml(t('common.delete'))}" aria-label="${escapeHtml(t('common.delete'))}">${icon('trash')}</button>
              <button class="btn" data-rule-advanced="${rule.id}" title="${escapeHtml(t('common.advanced'))}">${t('common.advanced')} ${icon('external', 12)}</button>
            </div>
          </div>
        `).join('') : `<div class="empty">${t('rules.noRules')}</div>`}
      </div>
      <p class="small"><button class="link-btn" id="quick-open-advanced-hint">${t('rules.advancedEditor')}</button></p>
    </div>
  `
}

export function renderQuickRuleEditor(state) {
  if (!state.quickRuleEditorOpen) return ''
  const form = state.quickRuleForm
  return `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h2>${form.id ? t('rules.editRule') : t('rules.createRule')}</h2>
          <button class="modal-close" id="quick-editor-close-x" aria-label="${t('common.close')}">×</button>
        </div>
        ${renderPresetPicker({ compact: true })}
        <div class="column">
          <label class="switch"><input type="checkbox" id="quick-enabled" ${form.enabled ? 'checked' : ''}/> ${t('common.enabled')}</label>
          <input class="input" id="quick-name" placeholder="${t('rules.ruleName')}" value="${escapeHtml(form.name)}" />
          <select class="select" id="quick-method">${['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map(method => `<option value="${method}" ${form.match.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
          <select class="select" id="quick-match-type">${['contains', 'equals'].map(type => `<option value="${type}" ${form.match.matchType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
          <input class="input" id="quick-url" placeholder="/api/user" value="${escapeHtml(form.match.urlPattern)}" />
          <select class="select" id="quick-action-type">${['mockResponse', 'failRequest', 'delayOnly', 'passThrough'].map(type => `<option value="${type}" ${form.action.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
          <input class="input" id="quick-status" type="number" placeholder="${t('rules.statusCode')}" value="${escapeHtml(form.action.statusCode)}" />
          <input class="input" id="quick-delay" type="number" placeholder="${t('rules.delayMs')}" value="${escapeHtml(form.action.delayMs)}" />
          <textarea class="textarea" id="quick-body">${escapeHtml(form.action.responseBody)}</textarea>
        </div>
        <div class="footer-actions">
          <button class="btn" id="quick-editor-cancel">${t('common.cancel')}</button>
          <button class="btn primary" id="quick-save-rule">${t('common.save')}</button>
          <button class="btn" id="quick-open-advanced">${t('rules.advanced')}</button>
        </div>
      </div>
    </div>
  `
}
