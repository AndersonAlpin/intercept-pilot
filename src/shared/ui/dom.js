import { escapeHtml } from '../utils.js'

export function joinClasses(...parts) {
  return parts
    .flatMap(part => Array.isArray(part) ? part : [part])
    .filter(Boolean)
    .map(part => String(part).trim())
    .filter(Boolean)
    .join(' ')
}

export function renderAttrs(attrs = {}) {
  return Object.entries(attrs || {})
    .filter(([, value]) => value !== null && value !== undefined && value !== false)
    .map(([name, value]) => value === true ? escapeHtml(name) : `${escapeHtml(name)}="${escapeHtml(value)}"`)
    .join(' ')
}

export function renderDataAttrs(data = {}) {
  const attrs = {}
  for (const [name, value] of Object.entries(data || {})) {
    if (value === null || value === undefined || value === false) continue
    attrs[`data-${name}`] = value
  }
  return renderAttrs(attrs)
}

export function delegate(container, eventName, selector, handler, options) {
  if (!(container instanceof Element) || !eventName || !selector || typeof handler !== 'function') {
    return () => {}
  }

  const listener = event => {
    const target = event.target instanceof Element
      ? event.target
      : event.target instanceof Node
        ? event.target.parentElement
        : null
    const delegateTarget = target?.closest(selector)
    if (!delegateTarget || !container.contains(delegateTarget)) return
    handler({ event, target, delegateTarget })
  }

  container.addEventListener(eventName, listener, options)
  return () => container.removeEventListener(eventName, listener, options)
}

export function patchHtml(targetOrSelector, html, options = {}) {
  const root = options.root || (typeof document !== 'undefined' ? document : null)
  const target = typeof targetOrSelector === 'string'
    ? root?.querySelector(targetOrSelector)
    : targetOrSelector

  if (!target) {
    if (typeof options.fallback === 'function') options.fallback()
    return null
  }

  if (target.innerHTML === html) return target
  target.innerHTML = html
  if (typeof options.afterPatch === 'function') options.afterPatch(target)
  return target
}

function getEventElement(event) {
  const target = event?.target
  if (typeof Element !== 'undefined' && target instanceof Element) return target
  if (target?.parentElement) return target.parentElement
  return null
}

export function createLiveUpdateGuard({
  getTarget,
  interactiveSelector,
  documentRef = typeof document !== 'undefined' ? document : null,
  windowRef = typeof window !== 'undefined' ? window : null,
  maxDelayMs = 1500,
  releaseDelayMs = 50
} = {}) {
  let pointerActive = false
  let waitingForClick = false
  let pendingUpdate = null
  let safetyTimer = null
  let releaseTimer = null

  const clearSafetyTimer = () => {
    if (!safetyTimer) return
    clearTimeout(safetyTimer)
    safetyTimer = null
  }

  const clearReleaseTimer = () => {
    if (!releaseTimer) return
    clearTimeout(releaseTimer)
    releaseTimer = null
  }

  const flush = () => {
    pointerActive = false
    waitingForClick = false
    clearSafetyTimer()
    clearReleaseTimer()
    const update = pendingUpdate
    pendingUpdate = null
    if (typeof update === 'function') update()
  }

  const scheduleSafetyFlush = () => {
    clearSafetyTimer()
    safetyTimer = setTimeout(flush, maxDelayMs)
  }

  const scheduleReleaseFlush = () => {
    clearReleaseTimer()
    releaseTimer = setTimeout(flush, releaseDelayMs)
  }

  const getRoot = () => typeof getTarget === 'function' ? getTarget() : null

  const onPointerDown = event => {
    if (event?.button != null && event.button !== 0) return
    const root = getRoot()
    const target = getEventElement(event)
    if (!root || !target || typeof root.contains !== 'function' || !root.contains(target)) return
    if (interactiveSelector && !target.closest?.(interactiveSelector)) return
    pointerActive = true
    waitingForClick = false
    scheduleSafetyFlush()
  }

  const onPointerRelease = () => {
    if (!pointerActive) return
    pointerActive = false
    waitingForClick = true
    clearSafetyTimer()
    scheduleReleaseFlush()
  }

  const onClick = () => {
    if (!waitingForClick) return
    clearReleaseTimer()
    releaseTimer = setTimeout(flush, 0)
  }

  documentRef?.addEventListener?.('pointerdown', onPointerDown, true)
  documentRef?.addEventListener?.('pointerup', onPointerRelease, true)
  documentRef?.addEventListener?.('pointercancel', onPointerRelease, true)
  documentRef?.addEventListener?.('click', onClick, true)
  windowRef?.addEventListener?.('blur', onPointerRelease, true)

  return {
    run(update) {
      if (typeof update !== 'function') return false
      if (!pointerActive && !waitingForClick) {
        update()
        return false
      }
      pendingUpdate = update
      scheduleSafetyFlush()
      return true
    },
    flush,
    isPointerActive() {
      return pointerActive || waitingForClick
    },
    destroy() {
      clearSafetyTimer()
      clearReleaseTimer()
      pendingUpdate = null
      pointerActive = false
      waitingForClick = false
      documentRef?.removeEventListener?.('pointerdown', onPointerDown, true)
      documentRef?.removeEventListener?.('pointerup', onPointerRelease, true)
      documentRef?.removeEventListener?.('pointercancel', onPointerRelease, true)
      documentRef?.removeEventListener?.('click', onClick, true)
      windowRef?.removeEventListener?.('blur', onPointerRelease, true)
    }
  }
}
