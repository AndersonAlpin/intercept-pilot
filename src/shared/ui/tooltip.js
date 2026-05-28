import { renderAttrs } from './dom.js'

const TOOLTIP_ID = 'app-tooltip'
let isBound = false
let activeTarget = null

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
  const tooltip = document.getElementById(TOOLTIP_ID)
  if (!tooltip) return
  tooltip.classList.remove('is-visible')
  tooltip.setAttribute('aria-hidden', 'true')
  activeTarget = null
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

export function getTooltipAttrs(text) {
  if (text == null || String(text).trim() === '') return {}
  return { 'data-tooltip': String(text) }
}

export function renderTooltipAttrs(text) {
  return renderAttrs(getTooltipAttrs(text))
}

export function initTooltips() {
  if (isBound || typeof document === 'undefined') return
  isBound = true
  getTooltipElement()

  document.addEventListener('pointerover', event => {
    const target = getTooltipTarget(event.target)
    if (!target) return
    updateTooltipPosition(target)
  })

  document.addEventListener('pointerout', event => {
    if (!activeTarget) return
    const nextTarget = getTooltipTarget(event.relatedTarget)
    if (nextTarget === activeTarget) return
    hideTooltip()
  })

  document.addEventListener('focusin', event => {
    const target = getTooltipTarget(event.target)
    if (!target) return
    updateTooltipPosition(target)
  })

  document.addEventListener('focusout', event => {
    if (!activeTarget) return
    const nextTarget = getTooltipTarget(event.relatedTarget)
    if (nextTarget === activeTarget) return
    hideTooltip()
  })

  window.addEventListener('scroll', hideTooltip, true)
  window.addEventListener('resize', hideTooltip)
}
