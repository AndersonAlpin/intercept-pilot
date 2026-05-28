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
  failRequest: 'danger',
  delayOnly: 'warning',
  passThrough: ''
}

function getMockResponseVariant(statusCode) {
  const code = Number(statusCode)

  if (Number.isNaN(code) || code < 200) return ''
  if (code < 300) return 'success'
  if (code < 500) return 'warning'
  return 'danger'
}

function getActionVariant(actionType, statusCode) {
  if (actionType === 'mockResponse') return getMockResponseVariant(statusCode)
  return ACTION_VARIANTS[actionType] || ''
}

export function renderRuleActionBadge({ actionType, statusCode, label, className, attrs, data } = {}) {
  return renderBadge({
    label,
    variant: getActionVariant(actionType, statusCode),
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
