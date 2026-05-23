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
