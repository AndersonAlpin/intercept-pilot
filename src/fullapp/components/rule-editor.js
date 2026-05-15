import { escapeHtml } from '../../shared/utils.js'

export function renderRuleEditor(state) {
  const rule = state.editingRule
  if (!rule) return '<section class="card"><h3>Rule Editor</h3><p class="muted">Select a rule to edit.</p></section>'

  return `
    <section class="card">
      <h3>Rule Editor</h3>
      <div class="grid two">
        <input class="input" id="editor-name" value="${escapeHtml(rule.name)}" placeholder="Rule name" />
        <input class="input" id="editor-priority" type="number" value="${escapeHtml(rule.priority)}" placeholder="Priority" />
      </div>
      <div class="grid three">
        <select class="select" id="editor-method">${['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS'].map(method => `<option value="${method}" ${rule.match.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
        <select class="select" id="editor-match-type">${['contains','equals','regex','glob'].map(type => `<option value="${type}" ${rule.match.matchType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
        <select class="select" id="editor-resource">${['ANY','XHR','Fetch','Document','Script','Image','Stylesheet','Other'].map(type => `<option value="${type}" ${rule.match.resourceType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
      </div>
      <input class="input" id="editor-url" value="${escapeHtml(rule.match.urlPattern)}" placeholder="URL pattern" />
      <div class="grid three">
        <select class="select" id="editor-action-type">${['mockResponse','failRequest','delayOnly','passThrough'].map(type => `<option value="${type}" ${rule.action.type === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
        <input class="input" id="editor-status-code" type="number" value="${escapeHtml(rule.action.statusCode)}" placeholder="Status code" />
        <input class="input" id="editor-delay" type="number" value="${escapeHtml(rule.action.delayMs)}" placeholder="Delay ms" />
      </div>
      <div class="grid two">
        <label class="switch"><input type="checkbox" id="editor-apply-body" ${rule.action.applyResponseBody ? 'checked' : ''}/> apply response body</label>
        <label class="switch"><input type="checkbox" id="editor-apply-headers" ${rule.action.applyResponseHeaders ? 'checked' : ''}/> apply response headers</label>
      </div>
      <input class="input" id="editor-content-type" value="${escapeHtml(rule.action.contentType || 'application/json')}" placeholder="Content-Type" />
      <textarea class="textarea" id="editor-response-headers" placeholder="Header: value">${escapeHtml(rule.action.responseHeaders || '')}</textarea>
      <textarea class="textarea code" id="editor-response-body">${escapeHtml(rule.action.responseBody || '')}</textarea>
      <div class="footer-actions">
        <button class="btn primary" id="editor-save-rule">Save rule</button>
      </div>
    </section>
  `
}
