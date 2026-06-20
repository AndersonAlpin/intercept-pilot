import { normalizeAiBridgeSessionPermissions } from './ai-bridge-permissions.js'

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
const MAX_AI_BRIDGE_RELEASED_VALUE_LENGTH = 1000
const MAX_AI_BRIDGE_RELEASED_HEADERS = 50

export function sanitizeAiBridgeQueryKeys(query) {
  return String(query || '')
    .replace(/^\?/, '')
    .split('&')
    .filter(part => part.includes('='))
    .map(part => part.split('=')[0])
    .map(part => decodeURIComponent(part || '').trim())
    .filter(Boolean)
}

function truncateReleasedValue(value) {
  const text = toStringValue(value)
  if (text.length <= MAX_AI_BRIDGE_RELEASED_VALUE_LENGTH) {
    return {
      text,
      truncated: false
    }
  }
  return {
    text: text.slice(0, MAX_AI_BRIDGE_RELEASED_VALUE_LENGTH),
    truncated: true
  }
}

function parseQueryValues(url) {
  const raw = toStringValue(url).trim()
  const values = {}
  try {
    const parsed = new URL(raw)
    parsed.searchParams.forEach((value, key) => {
      if (!key) return
      values[key] = value
    })
    return values
  } catch {
    const [withoutHash] = raw.split('#')
    const [, query = ''] = withoutHash.split('?')
    for (const part of query.split('&')) {
      if (!part.includes('=')) continue
      const [rawKey, ...rawValueParts] = part.split('=')
      const key = decodeURIComponent(rawKey || '').trim()
      if (!key) continue
      values[key] = decodeURIComponent(rawValueParts.join('=') || '')
    }
    return values
  }
}

function sanitizeUrl(url, permissions = {}) {
  const raw = toStringValue(url).trim()
  const allowQueryValues = Boolean(permissions.allowQueryValuesThisSession)
  if (!raw) {
    return {
      urlSanitized: '',
      urlOrigin: '',
      urlPath: '',
      queryKeys: [],
      hasQuery: false,
      ...(allowQueryValues ? { queryValues: {} } : {})
    }
  }

  try {
    const parsed = new URL(raw)
    return {
      urlSanitized: `${parsed.origin}${parsed.pathname}`,
      urlOrigin: parsed.origin,
      urlPath: parsed.pathname || '/',
      queryKeys: sanitizeAiBridgeQueryKeys(parsed.search),
      hasQuery: parsed.search.length > 1,
      ...(allowQueryValues ? { queryValues: parseQueryValues(raw) } : {})
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
      hasQuery: query.length > 0,
      ...(allowQueryValues ? { queryValues: parseQueryValues(raw) } : {})
    }
  }
}

function sanitizeHeaders(headers = []) {
  if (!Array.isArray(headers)) return []
  return headers.slice(0, MAX_AI_BRIDGE_RELEASED_HEADERS).map(header => {
    const value = truncateReleasedValue(header?.value)
    return {
      name: toStringValue(header?.name),
      value: value.text,
      truncated: value.truncated
    }
  })
}

function sanitizeBody(value) {
  const truncated = truncateReleasedValue(value)
  return {
    text: truncated.text,
    truncated: truncated.truncated,
    releasedByPermission: true
  }
}

function buildPermissionsApplied(flags = {}) {
  const applied = Object.fromEntries(Object.entries(flags).filter(([, value]) => Boolean(value)))
  return Object.keys(applied).length ? { permissionsApplied: applied } : {}
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

export function sanitizeAiBridgeRequest(entry = {}, rawPermissions = {}) {
  const permissions = normalizeAiBridgeSessionPermissions(rawPermissions)
  const urlParts = sanitizeUrl(entry.url, permissions)
  const requestHeadersAllowed = permissions.allowRequestHeadersThisSession && hasHeaders(entry.requestHeaders)
  const responseHeadersAllowed = permissions.allowResponseHeadersThisSession && hasHeaders(entry.responseHeaders)
  const requestBodyAllowed = permissions.allowRequestBodyThisSession && hasContent(entry.requestPostData)
  const responseBodyAllowed = permissions.allowResponseBodyThisSession && hasContent(entry.responseBody)
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
    responseBodyTruncated: Boolean(entry.responseBodyTruncated),
    ...(requestHeadersAllowed ? { requestHeaders: sanitizeHeaders(entry.requestHeaders) } : {}),
    ...(responseHeadersAllowed ? { responseHeaders: sanitizeHeaders(entry.responseHeaders) } : {}),
    ...(requestBodyAllowed ? { requestBody: sanitizeBody(entry.requestPostData) } : {}),
    ...(responseBodyAllowed ? { responseBody: sanitizeBody(entry.responseBody) } : {}),
    ...buildPermissionsApplied({
      queryValues: permissions.allowQueryValuesThisSession,
      requestHeaders: requestHeadersAllowed,
      responseHeaders: responseHeadersAllowed,
      requestBody: requestBodyAllowed,
      responseBody: responseBodyAllowed
    })
  }
}

export function sanitizeAiBridgeLog(log = {}, rawPermissions = {}) {
  const permissions = normalizeAiBridgeSessionPermissions(rawPermissions)
  const urlParts = sanitizeUrl(log.url, permissions)
  const message = sanitizeMessage(log.message)
  const stack = permissions.allowDetailedLogsThisSession && log.stack
    ? truncateReleasedValue(sanitizeMessage(log.stack).text)
    : null
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
    sensitiveContentRemoved: message.sensitiveContentRemoved,
    ...(urlParts.queryValues ? { queryValues: urlParts.queryValues } : {}),
    ...(stack ? { stackSanitized: stack.text, stackTruncated: stack.truncated } : {}),
    ...buildPermissionsApplied({
      queryValues: permissions.allowQueryValuesThisSession,
      detailedLogs: Boolean(stack)
    })
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

export function sanitizeAiBridgeRuleResult(entry = {}, rawPermissions = {}) {
  const permissions = normalizeAiBridgeSessionPermissions(rawPermissions)
  const urlParts = sanitizeUrl(entry.url, permissions)
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
    durationMs: entry.durationMs ?? null,
    ...(urlParts.queryValues ? { queryValues: urlParts.queryValues } : {}),
    ...buildPermissionsApplied({
      queryValues: permissions.allowQueryValuesThisSession
    })
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
