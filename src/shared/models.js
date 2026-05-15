import { DEFAULT_COLLECTION_ID } from './constants.js'
import { nowIso, uid } from './utils.js'

export function makeCollection(seed = {}) {
  const ts = nowIso()
  return {
    id: seed.id || uid('collection'),
    name: seed.name?.trim() || 'New Collection',
    description: seed.description || '',
    enabled: seed.enabled !== false,
    order: Number(seed.order ?? 0),
    createdAt: seed.createdAt || ts,
    updatedAt: ts
  }
}

export function makeDefaultCollection() {
  return {
    id: DEFAULT_COLLECTION_ID,
    name: 'Default',
    description: 'General API mocks',
    enabled: true,
    order: 0,
    createdAt: nowIso(),
    updatedAt: nowIso()
  }
}

export function makeRule(seed = {}, activeCollectionId = DEFAULT_COLLECTION_ID) {
  const ts = nowIso()
  return {
    id: seed.id || uid('rule'),
    collectionId: seed.collectionId || activeCollectionId,
    name: seed.name?.trim() || 'New Rule',
    enabled: seed.enabled !== false,
    priority: Number(seed.priority ?? 100),
    match: {
      urlPattern: seed.match?.urlPattern || '',
      matchType: seed.match?.matchType || 'contains',
      method: seed.match?.method || 'ANY',
      resourceType: seed.match?.resourceType || 'ANY'
    },
    action: {
      type: seed.action?.type || 'mockResponse',
      statusCode: Number(seed.action?.statusCode ?? 200),
      statusText: seed.action?.statusText || 'OK',
      contentType: seed.action?.contentType || 'application/json',
      delayMs: Number(seed.action?.delayMs ?? 0),
      failReason: seed.action?.failReason || 'Failed',
      applyResponseBody: seed.action?.applyResponseBody !== false,
      applyResponseHeaders: seed.action?.applyResponseHeaders === true,
      responseHeaders: seed.action?.responseHeaders || '',
      responseBody: seed.action?.responseBody || '{\n  "ok": true\n}'
    },
    diagnostics: {
      lastMatchedAt: seed.diagnostics?.lastMatchedAt || null,
      matchCount: Number(seed.diagnostics?.matchCount || 0),
      lastError: seed.diagnostics?.lastError || '',
      conflictIds: Array.isArray(seed.diagnostics?.conflictIds) ? seed.diagnostics.conflictIds : []
    },
    createdAt: seed.createdAt || ts,
    updatedAt: ts
  }
}
