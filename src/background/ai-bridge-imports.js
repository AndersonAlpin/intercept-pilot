import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE } from '../shared/export.js'
import { findCollectionConflictById, parseImportBundle } from '../shared/import-bundles.js'

export const MAX_AI_IMPORT_BUNDLE_BYTES = 256 * 1024

function byteLength(value) {
  return new TextEncoder().encode(String(value ?? '')).length
}

function createSafeImportError(code, message) {
  return {
    error: {
      code,
      message
    }
  }
}

function createImportSummary(bundle, collections = []) {
  if (bundle.type === BUNDLE_TYPE_COLLECTION) {
    const conflict = findCollectionConflictById(bundle, collections)
    return {
      type: bundle.type,
      collectionName: String(bundle.collection?.name || ''),
      ruleCount: Array.isArray(bundle.rules) ? bundle.rules.length : 0,
      conflict: conflict ? { id: conflict.id, name: conflict.name } : null
    }
  }

  return {
    type: bundle.type,
    ruleName: String(bundle.rule?.name || ''),
    ruleCount: 1,
    conflict: null
  }
}

function cloneJsonSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

export function createAiBridgeImportController(options = {}) {
  const {
    idGenerator = () => `ai-import-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
    now = () => new Date().toISOString(),
    applyImport = null
  } = options

  let pendingImport = null

  function getPendingImport() {
    return pendingImport ? cloneJsonSafe(pendingImport) : null
  }

  function createPendingImport(payload = {}, context = {}) {
    const bundleJson = String(payload.bundleJson || '')
    if (!bundleJson.trim()) {
      return createSafeImportError('INVALID_PAYLOAD', 'bundleJson must be a JSON string.')
    }
    if (byteLength(bundleJson) > MAX_AI_IMPORT_BUNDLE_BYTES) {
      return createSafeImportError('BUNDLE_TOO_LARGE', 'Import bundle is too large.')
    }

    const parsed = parseImportBundle(bundleJson)
    if (parsed.error === 'invalidJson') {
      return createSafeImportError('INVALID_JSON', 'Import bundle JSON is invalid.')
    }
    if (parsed.error || !parsed.bundle) {
      return createSafeImportError('INVALID_BUNDLE', 'Import bundle is not supported.')
    }

    const bundle = parsed.bundle
    const summary = createImportSummary(bundle, context.collections || [])
    pendingImport = {
      id: idGenerator(),
      source: 'AI Bridge',
      createdAt: now(),
      summary,
      bundle,
      bundleJson
    }

    return {
      status: 'awaiting_human_confirmation',
      pendingImportId: pendingImport.id,
      summary
    }
  }

  function cancelPendingImport(id = '') {
    if (!pendingImport) return { ok: true, pendingImport: null }
    if (id && pendingImport.id !== id) {
      return createSafeImportError('PENDING_IMPORT_NOT_FOUND', 'Pending import was not found.')
    }
    pendingImport = null
    return { ok: true, pendingImport: null }
  }

  async function confirmPendingImport(id = '', apply = applyImport) {
    if (!pendingImport || (id && pendingImport.id !== id)) {
      return createSafeImportError('PENDING_IMPORT_NOT_FOUND', 'Pending import was not found.')
    }

    const current = pendingImport
    if (apply) {
      const result = await apply(current.bundle)
      if (result?.error) return result
    }
    pendingImport = null
    return { ok: true, pendingImport: null }
  }

  return {
    createPendingImport,
    getPendingImport,
    cancelPendingImport,
    confirmPendingImport
  }
}

const aiBridgeImportController = createAiBridgeImportController()

export function createPendingAiImport(payload, context) {
  return aiBridgeImportController.createPendingImport(payload, context)
}

export function getPendingAiImport() {
  return aiBridgeImportController.getPendingImport()
}

export function cancelPendingAiImport(id) {
  return aiBridgeImportController.cancelPendingImport(id)
}

export function confirmPendingAiImport(id, applyImport) {
  return aiBridgeImportController.confirmPendingImport(id, applyImport)
}
