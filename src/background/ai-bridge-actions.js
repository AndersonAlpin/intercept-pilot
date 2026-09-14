export const AI_BRIDGE_RULE_ACTIONS = {
  enableRule: 'enable_rule',
  disableRule: 'disable_rule',
  setOnlyActiveRule: 'set_only_active_rule',
  setActiveCollection: 'set_active_collection',
  updateRule: 'update_rule',
  updateCollection: 'update_collection',
  deleteRule: 'delete_rule',
  deleteCollection: 'delete_collection'
}

export const AI_BRIDGE_TAB_ACTIONS = {
  reloadCapturedTab: 'reload_captured_tab',
  startCapture: 'start_capture',
  restartCapture: 'restart_capture',
  stopCapture: 'stop_capture',
  captureCurrentTab: 'capture_current_tab',
  setCaptureMode: 'set_capture_mode'
}

const ALLOWED_ACTIONS = new Set(Object.values(AI_BRIDGE_RULE_ACTIONS))
const ALLOWED_CAPTURE_ACTIONS = new Set([
  AI_BRIDGE_TAB_ACTIONS.startCapture,
  AI_BRIDGE_TAB_ACTIONS.restartCapture,
  AI_BRIDGE_TAB_ACTIONS.stopCapture,
  AI_BRIDGE_TAB_ACTIONS.captureCurrentTab,
  AI_BRIDGE_TAB_ACTIONS.setCaptureMode
])
const MAX_AFFECTED_RULES_SUMMARY = 5
const SAFE_RULE_UPDATE_FIELDS = new Set([
  'name',
  'enabled',
  'priority',
  'match.urlPattern',
  'match.matchType',
  'match.method',
  'match.resourceType',
  'action.type',
  'action.statusCode',
  'action.statusText',
  'action.contentType',
  'action.delayMs',
  'action.failReason'
])
const SAFE_COLLECTION_UPDATE_FIELDS = new Set([
  'name',
  'description',
  'enabled',
  'order'
])

function createSafeActionError(code, message) {
  return {
    error: {
      code,
      message
    }
  }
}

function cloneJsonSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value))
}

function normalizeRuleId(payload = {}) {
  return String(payload.ruleId || '').trim()
}

function normalizeCollectionId(payload = {}) {
  return String(payload.collectionId || '').trim()
}

function findRule(rules = [], ruleId = '') {
  return rules.find(rule => rule.id === ruleId) || null
}

function findCollection(collections = [], collectionId = '') {
  return collections.find(collection => collection.id === collectionId) || null
}

function getPathValue(source = {}, path = '') {
  return String(path || '').split('.').reduce((current, key) => (
    current && Object.hasOwn(current, key) ? current[key] : undefined
  ), source)
}

function normalizeDiffValue(value) {
  return value === undefined || value === null ? '' : value
}

function flattenPatch(patch = {}, prefix = '') {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return []
  return Object.entries(patch).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return flattenPatch(value, path)
    }
    return [{ field: path, value }]
  })
}

function createDiff(target = {}, patch = {}, allowedFields = new Set()) {
  const entries = flattenPatch(patch)
  if (!entries.length) {
    return createSafeActionError('INVALID_PAYLOAD', 'patch must include at least one allowed field.')
  }
  const diff = []
  for (const entry of entries) {
    if (!allowedFields.has(entry.field)) {
      return createSafeActionError('UNSAFE_UPDATE_FIELD', 'Requested update field is not allowed.')
    }
    const before = normalizeDiffValue(getPathValue(target, entry.field))
    const after = normalizeDiffValue(entry.value)
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff.push({ field: entry.field, before, after })
    }
  }
  if (!diff.length) {
    return createSafeActionError('NO_CHANGES', 'Requested update does not change any allowed field.')
  }
  return { diff }
}

function summarizeAffectedRules(action, rule, rules = []) {
  if (action !== AI_BRIDGE_RULE_ACTIONS.setOnlyActiveRule) {
    return {
      affectedRuleCount: 0,
      affectedRules: []
    }
  }

  const affectedRules = rules
    .filter(item => item.collectionId === rule.collectionId && item.id !== rule.id && item.enabled !== false)
    .map(item => ({
      id: item.id,
      name: String(item.name || '')
    }))

  return {
    affectedRuleCount: affectedRules.length,
    affectedRules: affectedRules.slice(0, MAX_AFFECTED_RULES_SUMMARY)
  }
}

function createActionSummary(action, rule, context = {}) {
  const collection = findCollection(context.collections || [], rule.collectionId)
  const affected = summarizeAffectedRules(action, rule, context.rules || [])

  return {
    ruleId: rule.id,
    ruleName: String(rule.name || ''),
    collectionId: String(rule.collectionId || ''),
    collectionName: String(collection?.name || ''),
    ...affected
  }
}

function createRuleUpdateSummary(rule, payload = {}, context = {}) {
  const diffResult = createDiff(rule, payload.patch, SAFE_RULE_UPDATE_FIELDS)
  if (diffResult.error) return diffResult
  const collection = findCollection(context.collections || [], rule.collectionId)

  return {
    summary: {
      ruleId: rule.id,
      ruleName: String(rule.name || ''),
      collectionId: String(rule.collectionId || ''),
      collectionName: String(collection?.name || ''),
      diff: diffResult.diff,
      reason: String(payload.reason || '')
    }
  }
}

function createCollectionUpdateSummary(collection, payload = {}) {
  const diffResult = createDiff(collection, payload.patch, SAFE_COLLECTION_UPDATE_FIELDS)
  if (diffResult.error) return diffResult

  return {
    summary: {
      collectionId: collection.id,
      collectionName: String(collection.name || ''),
      diff: diffResult.diff,
      reason: String(payload.reason || '')
    }
  }
}

function createSetActiveCollectionSummary(collection, context = {}) {
  const previousCollectionId = String(context.settings?.activeCollectionId || '')
  const previousCollection = findCollection(context.collections || [], previousCollectionId)
  if (previousCollectionId === collection.id) {
    return createSafeActionError('NO_CHANGES', 'Collection is already active.')
  }

  return {
    summary: {
      collectionId: collection.id,
      collectionName: String(collection.name || ''),
      previousCollectionId,
      previousCollectionName: String(previousCollection?.name || '')
    }
  }
}

function createRuleDeleteSummary(rule, context = {}) {
  const collection = findCollection(context.collections || [], rule.collectionId)
  return {
    ruleId: rule.id,
    ruleName: String(rule.name || ''),
    collectionId: String(rule.collectionId || ''),
    collectionName: String(collection?.name || '')
  }
}

function createCollectionDeleteSummary(collection, context = {}) {
  const affectedRules = (Array.isArray(context.rules) ? context.rules : [])
    .filter(rule => rule.collectionId === collection.id)
    .map(rule => ({
      id: rule.id,
      name: String(rule.name || '')
    }))

  return {
    collectionId: collection.id,
    collectionName: String(collection.name || ''),
    affectedRuleCount: affectedRules.length,
    affectedRules: affectedRules.slice(0, MAX_AFFECTED_RULES_SUMMARY)
  }
}

export function createAiBridgeRuleActionController(options = {}) {
  const {
    idGenerator = () => `ai-action-${Date.now().toString(36)}-${Math.random().toString(16).slice(2, 8)}`,
    now = () => new Date().toISOString(),
    applyAction = null
  } = options

  let pendingAction = null

  function getPendingAction() {
    return pendingAction ? cloneJsonSafe(pendingAction) : null
  }

  function createPendingAction(action, payload = {}, context = {}) {
    if (!ALLOWED_ACTIONS.has(action)) {
      return createSafeActionError('UNKNOWN_ACTION', 'Rule action is not allowed.')
    }
    if (pendingAction || context.hasPendingImport) {
      return createSafeActionError('PENDING_PROPOSAL_EXISTS', 'Another AI Bridge proposal is already pending.')
    }

    if (action === AI_BRIDGE_RULE_ACTIONS.updateCollection) {
      const collectionId = normalizeCollectionId(payload)
      if (!collectionId || !payload.patch || typeof payload.patch !== 'object') {
        return createSafeActionError('INVALID_PAYLOAD', 'collectionId and patch are required.')
      }
      const collection = findCollection(context.collections || [], collectionId)
      if (!collection) {
        return createSafeActionError('COLLECTION_NOT_FOUND', 'Collection was not found.')
      }
      const update = createCollectionUpdateSummary(collection, payload)
      if (update.error) return update
      pendingAction = {
        id: idGenerator(),
        source: 'AI Bridge',
        createdAt: now(),
        action,
        summary: update.summary
      }

      return {
        status: 'awaiting_human_confirmation',
        pendingActionId: pendingAction.id,
        action,
        summary: update.summary
      }
    }

    if (action === AI_BRIDGE_RULE_ACTIONS.setActiveCollection) {
      const collectionId = normalizeCollectionId(payload)
      if (!collectionId) {
        return createSafeActionError('INVALID_PAYLOAD', 'collectionId must be a non-empty string.')
      }
      const collection = findCollection(context.collections || [], collectionId)
      if (!collection) {
        return createSafeActionError('COLLECTION_NOT_FOUND', 'Collection was not found.')
      }
      const update = createSetActiveCollectionSummary(collection, context)
      if (update.error) return update
      pendingAction = {
        id: idGenerator(),
        source: 'AI Bridge',
        createdAt: now(),
        action,
        summary: update.summary
      }

      return {
        status: 'awaiting_human_confirmation',
        pendingActionId: pendingAction.id,
        action,
        summary: update.summary
      }
    }

    if (action === AI_BRIDGE_RULE_ACTIONS.deleteCollection) {
      const collectionId = normalizeCollectionId(payload)
      if (!collectionId) {
        return createSafeActionError('INVALID_PAYLOAD', 'collectionId must be a non-empty string.')
      }
      const collection = findCollection(context.collections || [], collectionId)
      if (!collection) {
        return createSafeActionError('COLLECTION_NOT_FOUND', 'Collection was not found.')
      }
      const summary = createCollectionDeleteSummary(collection, {
        rules: context.rules || []
      })
      pendingAction = {
        id: idGenerator(),
        source: 'AI Bridge',
        createdAt: now(),
        action,
        summary
      }

      return {
        status: 'awaiting_human_confirmation',
        pendingActionId: pendingAction.id,
        action,
        summary
      }
    }

    const ruleId = normalizeRuleId(payload)
    if (!ruleId) {
      return createSafeActionError('INVALID_PAYLOAD', 'ruleId must be a non-empty string.')
    }

    const rules = Array.isArray(context.rules) ? context.rules : []
    const rule = findRule(rules, ruleId)
    if (!rule) {
      return createSafeActionError('RULE_NOT_FOUND', 'Rule was not found.')
    }
    if (action === AI_BRIDGE_RULE_ACTIONS.updateRule) {
      if (!payload.patch || typeof payload.patch !== 'object') {
        return createSafeActionError('INVALID_PAYLOAD', 'patch must be an object.')
      }
      const update = createRuleUpdateSummary(rule, payload, {
        collections: context.collections || []
      })
      if (update.error) return update
      pendingAction = {
        id: idGenerator(),
        source: 'AI Bridge',
        createdAt: now(),
        action,
        summary: update.summary
      }

      return {
        status: 'awaiting_human_confirmation',
        pendingActionId: pendingAction.id,
        action,
        summary: update.summary
      }
    }
    if (action === AI_BRIDGE_RULE_ACTIONS.deleteRule) {
      const summary = createRuleDeleteSummary(rule, {
        collections: context.collections || []
      })
      pendingAction = {
        id: idGenerator(),
        source: 'AI Bridge',
        createdAt: now(),
        action,
        summary
      }

      return {
        status: 'awaiting_human_confirmation',
        pendingActionId: pendingAction.id,
        action,
        summary
      }
    }

    const summary = createActionSummary(action, rule, {
      rules,
      collections: context.collections || []
    })
    pendingAction = {
      id: idGenerator(),
      source: 'AI Bridge',
      createdAt: now(),
      action,
      summary
    }

    return {
      status: 'awaiting_human_confirmation',
      pendingActionId: pendingAction.id,
      action,
      summary
    }
  }

  function createReloadProposal(context = {}) {
    if (pendingAction || context.hasPendingImport) {
      return createSafeActionError('PENDING_PROPOSAL_EXISTS', 'Another AI Bridge proposal is already pending.')
    }

    const capturedTab = context.capturedTab || null
    if (!capturedTab || !capturedTab.tabId) {
      return createSafeActionError('CAPTURED_TAB_NOT_FOUND', 'No captured tab is available to reload.')
    }

    const summary = {
      origin: String(capturedTab.origin || ''),
      path: String(capturedTab.path || '')
    }
    pendingAction = {
      id: idGenerator(),
      source: 'AI Bridge',
      createdAt: now(),
      action: AI_BRIDGE_TAB_ACTIONS.reloadCapturedTab,
      summary
    }

    return {
      status: 'awaiting_human_confirmation',
      pendingActionId: pendingAction.id,
      action: AI_BRIDGE_TAB_ACTIONS.reloadCapturedTab,
      summary
    }
  }

  function createCaptureProposal(action, payload = {}, context = {}) {
    if (!ALLOWED_CAPTURE_ACTIONS.has(action)) return createSafeActionError('UNKNOWN_ACTION', 'Capture action is not allowed.')
    if (pendingAction || context.hasPendingImport) return createSafeActionError('PENDING_PROPOSAL_EXISTS', 'Another AI Bridge proposal is already pending.')
    if (!context.captureTarget?.tabId) return createSafeActionError('CAPTURE_TARGET_NOT_FOUND', 'No eligible web tab is available.')
    if (action === AI_BRIDGE_TAB_ACTIONS.setCaptureMode && !['auto', 'full', 'light'].includes(String(payload.mode || ''))) {
      return createSafeActionError('INVALID_CAPTURE_MODE', 'Capture mode must be auto, full, or light.')
    }
    const summary = {
      action,
      origin: String(context.captureTarget.origin || ''),
      path: String(context.captureTarget.path || ''),
      ...(action === AI_BRIDGE_TAB_ACTIONS.setCaptureMode ? { previousMode: String(context.captureMode || 'auto'), nextMode: String(payload.mode) } : {})
    }
    pendingAction = { id: idGenerator(), source: 'AI Bridge', createdAt: now(), action, summary }
    return { status: 'awaiting_human_confirmation', pendingActionId: pendingAction.id, action, summary }
  }

  function cancelPendingAction(id = '') {
    if (!pendingAction) return { ok: true, pendingAction: null }
    if (id && pendingAction.id !== id) {
      return createSafeActionError('PENDING_ACTION_NOT_FOUND', 'Pending action was not found.')
    }
    pendingAction = null
    return { ok: true, pendingAction: null }
  }

  async function confirmPendingAction(id = '', apply = applyAction) {
    if (!pendingAction || (id && pendingAction.id !== id)) {
      return createSafeActionError('PENDING_ACTION_NOT_FOUND', 'Pending action was not found.')
    }

    const current = pendingAction
    const result = apply ? await apply(current) : { ok: true }
    if (result?.error) return result
    pendingAction = null
    return {
      ok: true,
      pendingAction: null,
      ...(result || {})
    }
  }

  return {
    createPendingAction,
    createReloadProposal,
    createCaptureProposal,
    getPendingAction,
    cancelPendingAction,
    confirmPendingAction
  }
}

const aiBridgeRuleActionController = createAiBridgeRuleActionController()

export function createPendingAiRuleAction(action, payload, context) {
  return aiBridgeRuleActionController.createPendingAction(action, payload, context)
}

export function createPendingAiReloadAction(context) {
  return aiBridgeRuleActionController.createReloadProposal(context)
}

export function createPendingAiCaptureAction(action, payload, context) {
  return aiBridgeRuleActionController.createCaptureProposal(action, payload, context)
}

export function getPendingAiRuleAction() {
  return aiBridgeRuleActionController.getPendingAction()
}

export function cancelPendingAiRuleAction(id) {
  return aiBridgeRuleActionController.cancelPendingAction(id)
}

export function confirmPendingAiRuleAction(id, applyAction) {
  return aiBridgeRuleActionController.confirmPendingAction(id, applyAction)
}
