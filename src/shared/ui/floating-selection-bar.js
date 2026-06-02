import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
import { joinClasses, renderAttrs } from './dom.js'

export function renderFloatingSelectionBar({
  id,
  count = 0,
  label = '',
  clearLabel = '',
  deleteLabel = '',
  clearId,
  deleteId,
  className,
  attrs
} = {}) {
  const hidden = Number(count || 0) <= 0
  const disabled = hidden
  return `
    <div ${renderAttrs({
      ...(attrs || {}),
      id,
      class: joinClasses('floating-selection-bar', className, attrs?.class),
      'data-floating-selection-bar': true,
      hidden
    })}>
      <span class="floating-selection-bar__mark" aria-hidden="true">${icon('check', 14)}</span>
      <span class="floating-selection-bar__label" data-floating-selection-label>${escapeHtml(label)}</span>
      <span class="floating-selection-bar__divider" aria-hidden="true"></span>
      <button class="floating-selection-bar__button" type="button" id="${escapeHtml(clearId)}" ${disabled ? 'disabled' : ''}>${escapeHtml(clearLabel)}</button>
      <button class="floating-selection-bar__button floating-selection-bar__button--danger" type="button" id="${escapeHtml(deleteId)}" ${disabled ? 'disabled' : ''}>${escapeHtml(deleteLabel)}</button>
    </div>
  `
}
