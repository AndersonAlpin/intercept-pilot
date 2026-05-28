import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'
import { renderBadge } from './badge.js'
import { getTooltipAttrs } from './tooltip.js'

const STATE_ICONS = {
  ready: 'check',
  matched: 'zap',
  disabled: 'eye-off',
  error: 'alert',
  conflict: 'git-merge'
}

const ACTION_VARIANTS = {
  mockResponse: 'success',
  failRequest: 'danger',
  delayOnly: 'warning',
  passThrough: ''
}

export function renderRuleActionBadge({ actionType, label, className, attrs, data } = {}) {
  return renderBadge({
    label,
    variant: ACTION_VARIANTS[actionType] || '',
    className,
    attrs,
    data
  })
}

export function renderRuleStateBadge({ state, label, compact = false, className, attrs, data, iconName } = {}) {
  const stateValue = state || 'ready'
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('rule-state-badge', 'badge', compact ? 'compact' : '', className, attrs?.class),
    'aria-label': label
  }
  Object.assign(resolvedAttrs, getTooltipAttrs(label))
  const dataAttrs = renderDataAttrs({
    state: stateValue,
    ...(data || {})
  })
  const attributes = renderAttrs(resolvedAttrs)
  const iconHtml = icon(iconName || STATE_ICONS[stateValue] || 'check', 12)
  return `
    <span ${joinClasses(attributes, dataAttrs)}>
      ${iconHtml}
      <span class="badge-label">${escapeHtml(label ?? '')}</span>
    </span>
  `
}

export function renderRuleStateDot({ state, label, className, attrs, data } = {}) {
  const stateValue = state || 'ready'
  const resolvedAttrs = {
    ...(attrs || {}),
    class: joinClasses('rule-state-dot', className, attrs?.class),
    'aria-label': label,
    role: 'img'
  }
  Object.assign(resolvedAttrs, getTooltipAttrs(label))
  const dataAttrs = renderDataAttrs({
    state: stateValue,
    ...(data || {})
  })
  return `<span ${joinClasses(renderAttrs(resolvedAttrs), dataAttrs)}></span>`
}
