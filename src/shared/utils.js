export function uid(prefix = 'id') {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`
}

export function nowIso() {
  return new Date().toISOString()
}

export function clone(value) {
  return JSON.parse(JSON.stringify(value))
}

export function isHttpUrl(url = '') {
  return /^https?:\/\//i.test(String(url || ''))
}

export function safeRegex(pattern) {
  try {
    return new RegExp(pattern)
  } catch {
    return null
  }
}

export function globToRegex(glob) {
  const escaped = String(glob)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')
  return new RegExp(`^${escaped}$`)
}

export function truncate(text, size = 80) {
  const value = String(text || '')
  if (value.length <= size) return value
  return `${value.slice(0, size - 1)}…`
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
