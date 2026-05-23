import { icon } from '../icons.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderIconButton({
  iconName,
  label,
  id,
  className,
  variant,
  attrs,
  data,
  disabled,
  size = 16
} = {}) {
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('icon-btn', variant, className, attrs?.class),
    type: 'button'
  }
  if (id != null) resolvedAttrs.id = id
  if (disabled) resolvedAttrs.disabled = true
  if (label != null) {
    resolvedAttrs.title = label
    resolvedAttrs['aria-label'] = label
  }

  const attributes = renderAttrs(resolvedAttrs)
  const dataAttrs = renderDataAttrs(data)
  return `<button ${joinClasses(attributes, dataAttrs)}>${icon(iconName, size)}</button>`
}
