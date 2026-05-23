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

export function isCrossExtensionAccessError(error) {
  const message = String(error?.message || error || '')
  return message.includes('Cannot access a chrome-extension:// URL of different extension')
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

export function parseNetworkIgnorePatterns(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/[;\n]/)
  const patterns = []
  const seen = new Set()
  for (const item of source) {
    const pattern = String(item || '').trim()
    if (!pattern) continue
    const key = pattern.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    patterns.push(pattern)
  }
  return patterns
}

export function matchesNetworkIgnorePatterns(url, patterns = []) {
  const value = String(url || '').toLowerCase()
  if (!value) return false
  return parseNetworkIgnorePatterns(patterns)
    .some(pattern => value.includes(pattern.toLowerCase()))
}

export function debounce(fn, wait) {
  let timer = null
  let lastArgs = null
  let lastCtx = null
  const wrapped = function (...args) {
    lastArgs = args
    lastCtx = this
    clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(lastCtx, lastArgs)
    }, wait)
  }
  wrapped.flush = function () {
    if (timer) {
      clearTimeout(timer)
      timer = null
      fn.apply(lastCtx, lastArgs)
    }
  }
  wrapped.cancel = function () {
    clearTimeout(timer)
    timer = null
  }
  return wrapped
}

export function isHitOnlyDiff(oldRules, newRules) {
  if (!Array.isArray(oldRules) || !Array.isArray(newRules)) return false
  if (oldRules.length !== newRules.length) return false
  for (let i = 0; i < oldRules.length; i++) {
    const o = oldRules[i]
    const n = newRules[i]
    if (!o || !n || o.id !== n.id) return false
    const oCmp = { ...o, diagnostics: { ...(o.diagnostics || {}), matchCount: 0, lastMatchedAt: null } }
    const nCmp = { ...n, diagnostics: { ...(n.diagnostics || {}), matchCount: 0, lastMatchedAt: null } }
    if (JSON.stringify(oCmp) !== JSON.stringify(nCmp)) return false
  }
  return true
}

export function isOnlyNetworkFiltersDiff(oldSettings, newSettings) {
  const strip = obj => {
    const copy = { ...(obj || {}) }
    delete copy.networkFilters
    return copy
  }
  return JSON.stringify(strip(oldSettings)) === JSON.stringify(strip(newSettings))
}

export function tryPrettyJson(text) {
  if (text == null || text === '') return { pretty: '', isJson: false }
  try {
    const parsed = JSON.parse(text)
    return { pretty: JSON.stringify(parsed, null, 2), isJson: true }
  } catch {
    return { pretty: String(text), isJson: false }
  }
}

export function relativeTime(iso, now = Date.now()) {
  if (!iso) return null
  const ts = new Date(iso).getTime()
  if (Number.isNaN(ts)) return null
  const diff = Math.max(0, Math.floor((now - ts) / 1000))
  if (diff < 5) return { key: 'relativeTime.justNow' }
  if (diff < 60) return { key: 'relativeTime.secondsAgo', value: diff }
  if (diff < 3600) return { key: 'relativeTime.minutesAgo', value: Math.floor(diff / 60) }
  if (diff < 86400) return { key: 'relativeTime.hoursAgo', value: Math.floor(diff / 3600) }
  return { key: 'relativeTime.daysAgo', value: Math.floor(diff / 86400) }
}
