function toStringValue(value) {
  return String(value ?? '')
}

function hasContent(value) {
  return value != null && String(value) !== ''
}

function hasHeaders(headers) {
  return Array.isArray(headers) && headers.length > 0
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
      queryKeys: Array.from(parsed.searchParams.keys()),
      hasQuery: parsed.searchParams.toString().length > 0
    }
  } catch {
    const [withoutHash] = raw.split('#')
    const [withoutQuery, query = ''] = withoutHash.split('?')
    const queryKeys = query
      .split('&')
      .map(part => part.split('=')[0])
      .map(part => decodeURIComponent(part || '').trim())
      .filter(Boolean)

    return {
      urlSanitized: withoutQuery,
      urlOrigin: '',
      urlPath: withoutQuery,
      queryKeys,
      hasQuery: queryKeys.length > 0
    }
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
