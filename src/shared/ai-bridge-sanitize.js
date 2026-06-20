function toStringValue(value) {
  return String(value ?? '')
}

function hasContent(value) {
  return value != null && String(value) !== ''
}

function hasHeaders(headers) {
  return Array.isArray(headers) && headers.length > 0
}

const MAX_SANITIZED_LOG_MESSAGE_LENGTH = 300

export function sanitizeAiBridgeQueryKeys(query) {
  return String(query || '')
    .replace(/^\?/, '')
    .split('&')
    .filter(part => part.includes('='))
    .map(part => part.split('=')[0])
    .map(part => decodeURIComponent(part || '').trim())
    .filter(Boolean)
}

function sanitizeUrl(url) {
  const raw = toStringValue(url).trim()
  if (!raw) {
    return {
      urlSanitized: '',
      urlOrigin: '',
      urlPath: '',
      queryKeys: [],
      hasQuery: false
    }
  }

  try {
    const parsed = new URL(raw)
    return {
      urlSanitized: `${parsed.origin}${parsed.pathname}`,
      urlOrigin: parsed.origin,
      urlPath: parsed.pathname || '/',
      queryKeys: sanitizeAiBridgeQueryKeys(parsed.search),
      hasQuery: parsed.search.length > 1
    }
  } catch {
    const [withoutHash] = raw.split('#')
    const [withoutQuery, query = ''] = withoutHash.split('?')
    const queryKeys = sanitizeAiBridgeQueryKeys(query)

    return {
      urlSanitized: withoutQuery,
      urlOrigin: '',
      urlPath: withoutQuery,
      queryKeys,
      hasQuery: query.length > 0
    }
  }
}

function truncateMessage(message) {
  const text = toStringValue(message)
  if (text.length <= MAX_SANITIZED_LOG_MESSAGE_LENGTH) {
    return {
      text,
      truncated: false
    }
  }

  return {
    text: `${text.slice(0, MAX_SANITIZED_LOG_MESSAGE_LENGTH)}...`,
    truncated: true
  }
}

function sanitizeMessage(message) {
  const raw = toStringValue(message)
  let sanitized = raw

  sanitized = sanitized.replace(/https?:\/\/[^\s"'<>]+/g, match => sanitizeUrl(match).urlSanitized || '[url removed]')
  sanitized = sanitized.replace(/\b(authorization|set-cookie|cookie)\s*:\s*[^\s,;]+(?:\s+[^\s,;]+)?/gi, '[redacted]')
  sanitized = sanitized.replace(/\b(bearer)\s+[a-z0-9._~+/-]+/gi, '[redacted]')
  sanitized = sanitized.replace(/\b(token|access_token|refresh_token|api_key|secret|password|session|code|auth)\s*=\s*("[^"]*"|'[^']*'|[^\s,;&]+)/gi, '$1=[redacted]')
  sanitized = sanitized.replace(/"((?:access_)?token|refresh_token|api_key|secret|password|session|code|auth)"\s*:\s*"[^"]*"/gi, '"$1":"[redacted]"')

  const truncated = truncateMessage(sanitized)
  return {
    text: truncated.text,
    truncated: truncated.truncated,
    sensitiveContentRemoved: sanitized !== raw
  }
}

export function sanitizeAiBridgeRequest(entry = {}) {
  const urlParts = sanitizeUrl(entry.url)
  return {
    id: toStringValue(entry.id),
    method: toStringValue(entry.method),
    ...urlParts,
    status: entry.status ?? null,
    statusText: toStringValue(entry.statusText),
    resourceType: toStringValue(entry.resourceType),
    durationMs: entry.durationMs ?? null,
    startedAt: entry.startedAt ?? null,
    endedAt: entry.endedAt ?? null,
    intercepted: Boolean(entry.intercepted),
    matchedRuleId: entry.matchedRuleId ?? null,
    matchedRuleName: entry.matchedRuleName ?? null,
    appliedAction: toStringValue(entry.appliedAction),
    responseMimeType: toStringValue(entry.responseMimeType),
    requestHeadersPresent: hasHeaders(entry.requestHeaders),
    responseHeadersPresent: hasHeaders(entry.responseHeaders),
    requestBodyPresent: hasContent(entry.requestPostData),
    responseBodyPresent: hasContent(entry.responseBody),
    requestBodyTruncated: Boolean(entry.requestPostDataTruncated),
    responseBodyTruncated: Boolean(entry.responseBodyTruncated)
  }
}

export function sanitizeAiBridgeLog(log = {}) {
  const urlParts = sanitizeUrl(log.url)
  const message = sanitizeMessage(log.message)
  return {
    id: toStringValue(log.id),
    scope: toStringValue(log.scope),
    level: toStringValue(log.level),
    messageSanitized: message.text,
    urlSanitized: urlParts.urlSanitized,
    urlOrigin: urlParts.urlOrigin,
    urlPath: urlParts.urlPath,
    timestamp: log.timestamp ?? null,
    captureSessionId: log.captureSessionId ?? null,
    networkCycleId: log.networkCycleId ?? null,
    messageTruncated: message.truncated,
    hasQuery: urlParts.hasQuery,
    queryKeys: urlParts.queryKeys,
    sensitiveContentRemoved: message.sensitiveContentRemoved
  }
}

export function sanitizeAiBridgeCollection(collection = {}, options = {}) {
  return {
    id: toStringValue(collection.id),
    name: toStringValue(collection.name),
    description: toStringValue(collection.description),
    enabled: collection.enabled !== false,
    order: Number(collection.order ?? 0),
    ruleCount: Number(options.ruleCount || 0),
    active: Boolean(options.active)
  }
}

export function sanitizeAiBridgeRuleResult(entry = {}) {
  const urlParts = sanitizeUrl(entry.url)
  const ruleId = entry.matchedRuleId ?? null
  const ruleName = entry.matchedRuleName ?? null
  return {
    requestId: toStringValue(entry.id),
    ruleId,
    ruleName,
    urlSanitized: urlParts.urlSanitized,
    urlOrigin: urlParts.urlOrigin,
    urlPath: urlParts.urlPath,
    hasQuery: urlParts.hasQuery,
    queryKeys: urlParts.queryKeys,
    method: toStringValue(entry.method),
    resourceType: toStringValue(entry.resourceType),
    status: entry.status ?? null,
    statusText: toStringValue(entry.statusText),
    appliedAction: toStringValue(entry.appliedAction),
    intercepted: Boolean(entry.intercepted),
    matched: Boolean(ruleId || ruleName),
    startedAt: entry.startedAt ?? null,
    endedAt: entry.endedAt ?? null,
    durationMs: entry.durationMs ?? null
  }
}

export function sanitizeAiBridgeRule(rule = {}) {
  return {
    id: toStringValue(rule.id),
    collectionId: toStringValue(rule.collectionId),
    name: toStringValue(rule.name),
    enabled: rule.enabled !== false,
    priority: Number(rule.priority ?? 0),
    match: {
      urlPattern: toStringValue(rule.match?.urlPattern),
      matchType: toStringValue(rule.match?.matchType),
      method: toStringValue(rule.match?.method),
      resourceType: toStringValue(rule.match?.resourceType)
    },
    action: {
      type: toStringValue(rule.action?.type),
      statusCode: rule.action?.statusCode ?? undefined,
      statusText: rule.action?.statusText ?? undefined,
      contentType: rule.action?.contentType ?? undefined,
      delayMs: rule.action?.delayMs ?? undefined,
      failReason: rule.action?.failReason ?? undefined,
      applyResponseBody: rule.action?.applyResponseBody ?? undefined,
      applyResponseHeaders: rule.action?.applyResponseHeaders ?? undefined
    },
    diagnostics: {
      lastError: toStringValue(rule.diagnostics?.lastError),
      conflictIds: Array.isArray(rule.diagnostics?.conflictIds) ? [...rule.diagnostics.conflictIds] : []
    }
  }
}
