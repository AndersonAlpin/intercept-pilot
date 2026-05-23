import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderBadge({ label, variant, className, attrs, data, title, ariaLabel, iconHtml } = {}) {
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('badge', variant, className, attrs?.class)
  }
  if (title != null) resolvedAttrs.title = title
  if (ariaLabel != null) resolvedAttrs['aria-label'] = ariaLabel

  const attributes = renderAttrs(resolvedAttrs)
  const dataAttrs = renderDataAttrs(data)
  return `<span ${joinClasses(attributes, dataAttrs)}>${iconHtml || ''}${escapeHtml(label ?? '')}</span>`
}
