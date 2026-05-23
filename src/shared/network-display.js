function truncateMiddle(value, maxLength) {
  const text = String(value || '')
  if (text.length <= maxLength) return text
  const head = Math.max(12, Math.ceil((maxLength - 1) * 0.68))
  const tail = Math.max(8, maxLength - head - 1)
  return `${text.slice(0, head)}…${text.slice(-tail)}`
}

function formatDataUrl(value) {
  const match = String(value || '').match(/^data:([^;,]+)/i)
  if (!match?.[1]) return 'data URL'
  return `data:${match[1].toLowerCase()}`
}

export function formatNetworkDisplayUrl(url, options = {}) {
  const value = String(url || '').trim()
  if (!value) return '—'
  const compact = options.compact !== false
  const maxLength = Number(options.maxLength || (compact ? 96 : 140))

  if (/^data:/i.test(value)) return formatDataUrl(value)

  try {
    const parsed = new URL(value)
    const path = parsed.pathname || '/'
    const searchLabel = parsed.search ? '?…' : ''
    const hashLabel = !parsed.search && parsed.hash ? '#…' : ''
    return truncateMiddle(`${parsed.origin}${path}${searchLabel}${hashLabel}`, maxLength)
  } catch {
    const queryIndex = value.indexOf('?')
    const withoutQuery = queryIndex >= 0 ? `${value.slice(0, queryIndex)}?…` : value
    return truncateMiddle(withoutQuery, maxLength)
  }
}
