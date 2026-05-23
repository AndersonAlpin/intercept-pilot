import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderButton({
  id,
  label,
  variant,
  className,
  attrs,
  data,
  disabled,
  title,
  ariaLabel,
  type = 'button',
  iconHtml,
  iconPosition = 'end'
} = {}) {
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('btn', variant, className, attrs?.class),
    type
  }
  if (id != null) resolvedAttrs.id = id
  if (disabled) resolvedAttrs.disabled = true
  if (title != null) resolvedAttrs.title = title
  if (ariaLabel != null) resolvedAttrs['aria-label'] = ariaLabel

  const attributes = renderAttrs(resolvedAttrs)
  const dataAttrs = renderDataAttrs(data)
  const icon = iconHtml || ''
  const text = escapeHtml(label ?? '')
  const content = icon && iconPosition === 'start' ? `${icon}${text}` : `${text}${icon}`
  return `<button ${joinClasses(attributes, dataAttrs)}>${content}</button>`
}
