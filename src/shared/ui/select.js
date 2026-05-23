import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

function renderOption(option, selectedValue) {
  const value = String(option?.value ?? '')
  const label = option?.label ?? value
  const selected = String(selectedValue ?? '') === value
  const attrs = renderAttrs({
    value,
    selected,
    disabled: Boolean(option?.disabled)
  })
  return `<option ${attrs}>${escapeHtml(label)}</option>`
}

export function renderSelect({
  id,
  value,
  options = [],
  className,
  attrs,
  data,
  ariaLabel,
  placeholder,
  disabled
} = {}) {
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('select', className, attrs?.class)
  }
  if (id != null) resolvedAttrs.id = id
  if (ariaLabel != null) resolvedAttrs['aria-label'] = ariaLabel
  if (disabled) resolvedAttrs.disabled = true

  const attributes = renderAttrs(resolvedAttrs)
  const dataAttrs = renderDataAttrs(data)
  const placeholderHtml = placeholder != null
    ? renderOption({ value: '', label: placeholder, disabled: true }, value)
    : ''
  return `<select ${joinClasses(attributes, dataAttrs)}>${placeholderHtml}${options.map(option => renderOption(option, value)).join('')}</select>`
}
