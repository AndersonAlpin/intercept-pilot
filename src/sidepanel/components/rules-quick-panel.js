import { escapeHtml, truncate } from '../../shared/utils.js'

function actionBadge(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') return '<span class="badge success">mock 200</span>'
  if (type === 'failRequest') return '<span class="badge danger">fail</span>'
  if (type === 'delayOnly') return '<span class="badge warning">delay</span>'
  return '<span class="badge">pass</span>'
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
        <h2>Rules</h2>
        <button class="btn primary" id="quick-new-rule-btn">+ Rule</button>
      </div>
      <input class="input" id="rules-search" placeholder="Search rules" value="${escapeHtml(state.rulesFilter || '')}" />
      <div class="list">
        ${filtered.length ? filtered.map(rule => `
          <div class="item ${rule.diagnostics?.lastError ? 'rule-error' : ''}">
            <div class="item-title">
              <label class="switch"><input type="checkbox" data-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''}/> enabled</label>
              ${actionBadge(rule)}
            </div>
            <strong>${escapeHtml(truncate(rule.name, 48))}</strong>
            <div class="item-meta">${escapeHtml(rule.match?.method || 'ANY')} · ${escapeHtml(truncate(rule.match?.urlPattern || '', 64))}</div>
            <div class="footer-actions">
              <button class="btn" data-rule-edit="${rule.id}">Edit</button>
              <button class="btn" data-rule-advanced="${rule.id}">Advanced ↗</button>
            </div>
          </div>
        `).join('') : '<div class="empty">No rules in this collection.</div>'}
      </div>
      <p class="small">Need headers, regex, priority or diagnostics? Open advanced editor ↗</p>
    </div>
  `
}

export function renderQuickRuleEditor(state) {
  if (!state.quickRuleEditorOpen) return ''
  const form = state.quickRuleForm
  return `
    <div class="card compact-card">
      <div class="row space-between">
        <h2>${form.id ? 'Edit Rule' : 'Create Rule'}</h2>
        <button class="btn" id="quick-editor-cancel">Cancel</button>
      </div>
      <div class="column">
        <label class="switch"><input type="checkbox" id="quick-enabled" ${form.enabled ? 'checked' : ''}/> enabled</label>
        <input class="input" id="quick-name" placeholder="Rule name" value="${escapeHtml(form.name)}" />
        <select class="select" id="quick-method">${['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'].map(method => `<option value="${method}" ${form.match.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
        <select class="select" id="quick-match-type">${['contains', 'equals'].map(type => `<option value="${type}" ${form.match.matchType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
        <input class="input" id="quick-url" placeholder="/api/user" value="${escapeHtml(form.match.urlPattern)}" />
        <select class="select" id="quick-action-type">${['mockResponse', 'failRequest', 'delayOnly', 'passThrough'].map(type => `<option value="${type}" ${form.action.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
        <input class="input" id="quick-status" type="number" placeholder="200" value="${escapeHtml(form.action.statusCode)}" />
        <input class="input" id="quick-delay" type="number" placeholder="0" value="${escapeHtml(form.action.delayMs)}" />
        <textarea class="textarea" id="quick-body">${escapeHtml(form.action.responseBody)}</textarea>
        <div class="footer-actions">
          <button class="btn primary" id="quick-save-rule">${form.id ? 'Save quick edit' : 'Create enabled rule'}</button>
          <button class="btn" id="quick-open-advanced">Advanced ↗</button>
        </div>
      </div>
    </div>
  `
}
