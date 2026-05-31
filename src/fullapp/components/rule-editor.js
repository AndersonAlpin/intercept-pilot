import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'
import { renderSelect } from '../../shared/ui/select.js'
import { renderSwitch } from '../../shared/ui/toggle.js'
import { renderPresetPicker } from './preset-picker.js'

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
    .map(method => ({ value: method, label: method === 'ANY' ? t('common.all') : method }))
  const matchTypeOptions = ['contains','equals','regex','glob']
    .map(type => ({ value: type, label: type }))
  const resourceOptions = ['ANY','XHR','Fetch','Document','Script','Image','Stylesheet','Other']
    .map(type => ({ value: type, label: type === 'ANY' ? t('common.all') : type }))
  const actionTypeOptions = ['mockResponse','failRequest','delayOnly','passThrough']
    .map(type => ({ value: type, label: type }))

  const bodyHtml = `
    ${renderPresetPicker()}

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
        control: renderSelect({ id: 'editor-method', value: rule.match.method, options: methodOptions })
      })}
      ${field({
        id: 'editor-match-type',
        label: t('rules.fields.matchType'),
        control: renderSelect({ id: 'editor-match-type', value: rule.match.matchType, options: matchTypeOptions })
      })}
      ${field({
        id: 'editor-resource',
        label: t('rules.fields.resourceType'),
        control: renderSelect({ id: 'editor-resource', value: rule.match.resourceType, options: resourceOptions })
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
        control: renderSelect({ id: 'editor-action-type', value: rule.action.type, options: actionTypeOptions })
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
      ${renderSwitch({
        id: 'editor-apply-body',
        checked: rule.action.applyResponseBody,
        label: t('rules.fields.applyResponseBody'),
        className: 'checkbox-field'
      })}
      ${renderSwitch({
        id: 'editor-apply-headers',
        checked: rule.action.applyResponseHeaders,
        label: t('rules.fields.applyResponseHeaders'),
        className: 'checkbox-field'
      })}
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
  `
  const footerHtml = `
    <button class="btn" id="editor-cancel-rule">${escapeHtml(t('common.cancel'))}</button>
    <button class="btn primary" id="editor-save-rule">${escapeHtml(t('common.save'))}</button>
  `

  return renderModalShell({
    title: t('fullapp.ruleEditor'),
    bodyHtml,
    footerHtml,
    dialogClassName: 'modal-rule-editor',
    headerClassName: 'modal-sticky-header',
    bodyClassName: 'modal-scroll-body',
    footerClassName: 'footer-actions modal-sticky-footer',
    closeId: 'editor-close-x',
    closeLabel: t('common.close')
  })
}
