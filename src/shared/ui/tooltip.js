import { renderAttrs } from './dom.js'

const TOOLTIP_ID = 'app-tooltip'
const DEFAULT_TOOLTIP_DELAY_MS = 0
let isBound = false
let activeTarget = null
let pendingTarget = null
let showTimer = null
let isPointerDown = false

function getTooltipElement() {
  let element = document.getElementById(TOOLTIP_ID)
  if (element) return element

  element = document.createElement('div')
  element.id = TOOLTIP_ID
  element.className = 'app-tooltip'
  element.setAttribute('role', 'tooltip')
  element.setAttribute('aria-hidden', 'true')
  document.body.appendChild(element)
  return element
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function hideTooltip() {
  clearPendingTooltip()
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (!tooltip) return
  tooltip.classList.remove('is-visible')
  tooltip.setAttribute('aria-hidden', 'true')
  activeTarget = null
}

function clearPendingTooltip() {
  if (showTimer) {
    window.clearTimeout(showTimer)
    showTimer = null
  }
  pendingTarget = null
}

function hasActiveTextSelection() {
  if (typeof window === 'undefined' || typeof window.getSelection !== 'function') return false
  const selection = window.getSelection()
  return Boolean(selection && !selection.isCollapsed && String(selection).trim())
}

function getTooltipTarget(node) {
  return node instanceof Element ? node.closest('[data-tooltip]') : null
}

function updateTooltipPosition(target) {
  const tooltip = getTooltipElement()
  const text = target?.dataset?.tooltip
  if (!text) {
    hideTooltip()
    return
  }

  tooltip.textContent = text
  tooltip.classList.add('is-visible')
  tooltip.setAttribute('aria-hidden', 'false')
  tooltip.style.left = '0px'
  tooltip.style.top = '0px'
  tooltip.style.maxWidth = `${Math.min(320, Math.max(180, window.innerWidth - 24))}px`

  const rect = target.getBoundingClientRect()
  const gap = 10
  const tooltipRect = tooltip.getBoundingClientRect()
  const placeBelow = rect.top < tooltipRect.height + 20
  const top = placeBelow
    ? rect.bottom + gap
    : rect.top - tooltipRect.height - gap
  const left = clamp(
    rect.left + (rect.width / 2) - (tooltipRect.width / 2),
    12,
    window.innerWidth - tooltipRect.width - 12
  )

  tooltip.dataset.placement = placeBelow ? 'bottom' : 'top'
  tooltip.style.left = `${Math.round(left)}px`
  tooltip.style.top = `${Math.round(top)}px`
  activeTarget = target
}

function parseTooltipDelay(value) {
  const delay = Number(value)
  if (!Number.isFinite(delay) || delay <= 0) return DEFAULT_TOOLTIP_DELAY_MS
  return Math.round(delay)
}

function scheduleTooltip(target) {
  const delay = parseTooltipDelay(target?.dataset?.tooltipDelay)

  clearPendingTooltip()
  if (activeTarget && activeTarget !== target) {
    hideTooltip()
  }

  if (isPointerDown || hasActiveTextSelection()) {
    return
  }

  if (delay <= 0) {
    updateTooltipPosition(target)
    return
  }

  pendingTarget = target
  showTimer = window.setTimeout(() => {
    if (pendingTarget === target) {
      updateTooltipPosition(target)
    }
    clearPendingTooltip()
  }, delay)
}

export function getTooltipAttrs(text, { delayMs } = {}) {
  if (text == null || String(text).trim() === '') return {}
  const attrs = { 'data-tooltip': String(text) }
  const delay = parseTooltipDelay(delayMs)
  if (delay > 0) attrs['data-tooltip-delay'] = String(delay)
  return attrs
}

export function renderTooltipAttrs(text, options) {
  return renderAttrs(getTooltipAttrs(text, options))
}

export function initTooltips() {
  if (isBound || typeof document === 'undefined') return
  isBound = true
  getTooltipElement()

  document.addEventListener('pointerdown', () => {
    isPointerDown = true
    hideTooltip()
  })

  document.addEventListener('pointerup', () => {
    isPointerDown = false
  })

  document.addEventListener('pointerover', event => {
    const target = getTooltipTarget(event.target)
    if (!target) return
    scheduleTooltip(target)
  })

  document.addEventListener('pointermove', event => {
    const target = getTooltipTarget(event.target)
    if (!target) {
      clearPendingTooltip()
      return
    }

    const delay = parseTooltipDelay(target.dataset?.tooltipDelay)
    if (delay <= 0) return
    if (activeTarget === target) return

    scheduleTooltip(target)
  })

  document.addEventListener('pointerout', event => {
    clearPendingTooltip()
    if (!activeTarget) return
    const nextTarget = getTooltipTarget(event.relatedTarget)
    if (nextTarget === activeTarget) return
    hideTooltip()
  })

  document.addEventListener('focusin', event => {
    const target = getTooltipTarget(event.target)
    if (!target) return
    clearPendingTooltip()
    updateTooltipPosition(target)
  })

  document.addEventListener('focusout', event => {
    clearPendingTooltip()
    if (!activeTarget) return
    const nextTarget = getTooltipTarget(event.relatedTarget)
    if (nextTarget === activeTarget) return
    hideTooltip()
  })

  document.addEventListener('selectionchange', () => {
    if (hasActiveTextSelection()) {
      hideTooltip()
    }
  })

  window.addEventListener('scroll', hideTooltip, true)
  window.addEventListener('resize', hideTooltip)
}
