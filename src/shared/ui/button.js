import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
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
  iconName,
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
  const renderedIcon = iconHtml || (iconName ? icon(iconName) : '')
  const iconMarkup = renderedIcon ? `<span class="btn__icon">${renderedIcon}</span>` : ''
  const labelMarkup = label != null ? `<span class="btn__label">${escapeHtml(label)}</span>` : ''
  const content = iconMarkup && iconPosition === 'start'
    ? `${iconMarkup}${labelMarkup}`
    : `${labelMarkup}${iconMarkup}`
  return `<button ${joinClasses(attributes, dataAttrs)}>${content}</button>`
}
