import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs } from './dom.js'

export function renderField({
  id,
  label,
  controlHtml,
  hint,
  className = 'field',
  labelClassName = 'field-label',
  hintClassName = 'field-hint',
  required = false,
  attrs
} = {}) {
  const attributes = renderAttrs({
    ...(attrs || {}),
    class: joinClasses(className, attrs?.class)
  })
  const labelAttrs = renderAttrs({
    class: labelClassName,
    for: id || null
  })
  const hintAttrs = renderAttrs({
    class: hintClassName
  })
  const requiredMark = required ? ' *' : ''
  return `
    <div ${attributes}>
      ${label != null ? `<label ${labelAttrs}>${escapeHtml(label)}${requiredMark}</label>` : ''}
      ${controlHtml || ''}
      ${hint ? `<div ${hintAttrs}>${escapeHtml(hint)}</div>` : ''}
    </div>
  `
}
