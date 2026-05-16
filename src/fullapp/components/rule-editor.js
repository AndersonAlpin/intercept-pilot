import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function field({ id, label, control }) {
  return `
    <div class="field">
      <label class="field-label" for="${id}">${escapeHtml(label)}</label>
      ${control}
    </div>
  `
}

export function renderRuleEditor(state) {
  const rule = state.editingRule
  if (!rule) return ''

  const methodOptions = ['ANY','GET','POST','PUT','PATCH','DELETE','OPTIONS']
    .map(method => `<option value="${method}" ${rule.match.method === method ? 'selected' : ''}>${method}</option>`).join('')
  const matchTypeOptions = ['contains','equals','regex','glob']
    .map(type => `<option value="${type}" ${rule.match.matchType === type ? 'selected' : ''}>${type}</option>`).join('')
  const resourceOptions = ['ANY','XHR','Fetch','Document','Script','Image','Stylesheet','Other']
    .map(type => `<option value="${type}" ${rule.match.resourceType === type ? 'selected' : ''}>${type}</option>`).join('')
  const actionTypeOptions = ['mockResponse','failRequest','delayOnly','passThrough']
    .map(type => `<option value="${type}" ${rule.action.type === type ? 'selected' : ''}>${type}</option>`).join('')

  return `
    <div class="modal-backdrop" data-modal-backdrop>
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-header">
          <h3>${escapeHtml(t('fullapp.ruleEditor'))}</h3>
          <button class="modal-close" id="editor-close-x" aria-label="${escapeHtml(t('common.close'))}">×</button>
        </div>

        <div class="grid two">
          ${field({
            id: 'editor-name',
            label: t('rules.fields.name'),
            control: `<input class="input" id="editor-name" value="${escapeHtml(rule.name)}" placeholder="${escapeHtml(t('rules.fields.name'))}" />`
          })}
          ${field({
            id: 'editor-priority',
            label: t('rules.fields.priority'),
            control: `<input class="input" id="editor-priority" type="number" value="${escapeHtml(rule.priority)}" />`
          })}
        </div>

        <div class="grid three">
          ${field({
            id: 'editor-method',
            label: t('rules.fields.method'),
            control: `<select class="select" id="editor-method">${methodOptions}</select>`
          })}
          ${field({
            id: 'editor-match-type',
            label: t('rules.fields.matchType'),
            control: `<select class="select" id="editor-match-type">${matchTypeOptions}</select>`
          })}
          ${field({
            id: 'editor-resource',
            label: t('rules.fields.resourceType'),
            control: `<select class="select" id="editor-resource">${resourceOptions}</select>`
          })}
        </div>

        ${field({
          id: 'editor-url',
          label: t('rules.fields.urlPattern'),
          control: `<input class="input" id="editor-url" value="${escapeHtml(rule.match.urlPattern)}" placeholder="${escapeHtml(t('rules.fields.urlPattern'))}" />`
        })}

        <div class="grid three">
          ${field({
            id: 'editor-action-type',
            label: t('rules.fields.actionType'),
            control: `<select class="select" id="editor-action-type">${actionTypeOptions}</select>`
          })}
          ${field({
            id: 'editor-status-code',
            label: t('rules.fields.statusCode'),
            control: `<input class="input" id="editor-status-code" type="number" value="${escapeHtml(rule.action.statusCode)}" />`
          })}
          ${field({
            id: 'editor-delay',
            label: t('rules.fields.delayMs'),
            control: `<input class="input" id="editor-delay" type="number" value="${escapeHtml(rule.action.delayMs)}" />`
          })}
        </div>

        <div class="grid two">
          <label class="switch checkbox-field" for="editor-apply-body">
            <input type="checkbox" id="editor-apply-body" ${rule.action.applyResponseBody ? 'checked' : ''}/>
            <span>${escapeHtml(t('rules.fields.applyResponseBody'))}</span>
          </label>
          <label class="switch checkbox-field" for="editor-apply-headers">
            <input type="checkbox" id="editor-apply-headers" ${rule.action.applyResponseHeaders ? 'checked' : ''}/>
            <span>${escapeHtml(t('rules.fields.applyResponseHeaders'))}</span>
          </label>
        </div>

        ${field({
          id: 'editor-content-type',
          label: t('rules.fields.contentType'),
          control: `<input class="input" id="editor-content-type" value="${escapeHtml(rule.action.contentType || 'application/json')}" placeholder="application/json" />`
        })}

        ${field({
          id: 'editor-response-headers',
          label: t('rules.fields.responseHeaders'),
          control: `<textarea class="textarea" id="editor-response-headers" placeholder="Header: value">${escapeHtml(rule.action.responseHeaders || '')}</textarea>`
        })}

        ${field({
          id: 'editor-response-body',
          label: t('rules.fields.responseBody'),
          control: `<textarea class="textarea code" id="editor-response-body">${escapeHtml(rule.action.responseBody || '')}</textarea>`
        })}

        <div class="footer-actions">
          <button class="btn" id="editor-cancel-rule">${escapeHtml(t('common.cancel'))}</button>
          <button class="btn primary" id="editor-save-rule">${escapeHtml(t('common.save'))}</button>
        </div>
      </div>
    </div>
  `
}
