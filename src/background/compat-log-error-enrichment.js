function normalizeText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseFetchErrorContext(message) {
  const match = String(message || '').match(/\[(?<method>[A-Z]+)\]\s+"(?<url>https?:\/\/[^"]+)"\s*:\s*(?<status>\d{3})/i)
  if (!match?.groups?.url) return null
  return {
    method: String(match.groups.method || '').toUpperCase(),
    url: String(match.groups.url || ''),
    status: Number(match.groups.status || 0),
  }
}

function extractApiErrorDetails(responseBody) {
  if (!String(responseBody || '').trim()) return null

  try {
    const parsed = JSON.parse(String(responseBody))
    const code = typeof parsed?.errCode === 'string' ? normalizeText(parsed.errCode) : ''
    const errMsgRaw = Array.isArray(parsed?.errMsg)
      ? parsed.errMsg
      : typeof parsed?.errMsg === 'string'
        ? [parsed.errMsg]
        : typeof parsed?.message === 'string'
          ? [parsed.message]
          : typeof parsed?.error === 'string'
            ? [parsed.error]
            : []
    const messages = errMsgRaw.map(normalizeText).filter(Boolean)
    const details = messages.join(' | ')
    const summary = code && details ? `${code}: ${details}` : code || details
    if (!summary) return null
    return { code, details: details || summary, summary }
  } catch {
    return null
  }
}

function findRelatedNetworkEntry({ context, tabId, networkEntries }) {
  const entries = Array.isArray(networkEntries) ? networkEntries : []
  const targetTabId = Number(tabId || 0)

  return entries
    .filter(entry => {
      if (!entry || String(entry.url || '') !== context.url) return false
      if (context.method && String(entry.method || '').toUpperCase() !== context.method) return false
      if (context.status && Number(entry.status || 0) !== context.status) return false
      if (targetTabId && Number(entry.networkTabId || 0) && Number(entry.networkTabId || 0) !== targetTabId) {
        return false
      }
      return true
    })
    .sort((a, b) => Number(b?.endedAt || 0) - Number(a?.endedAt || 0))[0] || null
}

function appendSummary(message, summary) {
  const base = String(message || '').trim()
  const normalizedSummary = normalizeText(summary)
  if (!base || !normalizedSummary) return base || normalizedSummary
  if (base.includes(normalizedSummary)) return base
  return `${base} | ${normalizedSummary}`
}

export async function enrichFetchErrorLog({
  message,
  tabId,
  networkEntries = [],
  resolveResponseBody,
} = {}) {
  const context = parseFetchErrorContext(message)
  if (!context) return null

  const entry = findRelatedNetworkEntry({ context, tabId, networkEntries })
  if (!entry) return null

  let responseBody =
    entry.responseBodyLoaded === 'loaded' && typeof entry.responseBody === 'string'
      ? entry.responseBody
      : ''

  if (!responseBody && typeof resolveResponseBody === 'function') {
    const resolved = await resolveResponseBody(entry)
    responseBody = typeof resolved?.body === 'string' ? resolved.body : ''
  }

  const details = extractApiErrorDetails(responseBody)
  return {
    originalMessage: String(message || '').trim(),
    message: details?.summary ? appendSummary(message, details.summary) : String(message || '').trim(),
    relatedNetworkEntryId: entry.id,
    requestMethod: context.method,
    requestUrl: context.url,
    responseStatus: Number(entry.status || context.status || 0),
    responseErrorCode: details?.code || '',
    responseErrorSummary: details?.summary || '',
    responseErrorDetails: details?.details || '',
  }
}
