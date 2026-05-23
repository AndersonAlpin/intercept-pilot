import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs } from './dom.js'

export function renderEmptyState({ message, helper, className, attrs } = {}) {
  const attributes = renderAttrs({
    ...(attrs || {}),
    class: joinClasses('empty', className, attrs?.class)
  })
  return `
    <div ${attributes}>
      <div>${escapeHtml(message ?? '')}</div>
      ${helper ? `<div class="empty-helper">${escapeHtml(helper)}</div>` : ''}
    </div>
  `
}
