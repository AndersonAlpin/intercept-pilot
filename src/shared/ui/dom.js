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
  const root = options.root || document
  const target = typeof targetOrSelector === 'string'
    ? root.querySelector(targetOrSelector)
    : targetOrSelector

  if (!target) {
    if (typeof options.fallback === 'function') options.fallback()
    return null
  }

  target.innerHTML = html
  if (typeof options.afterPatch === 'function') options.afterPatch(target)
  return target
}
