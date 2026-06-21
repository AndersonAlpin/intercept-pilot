export const AI_BRIDGE_RULE_ACTIONS = {
  enableRule: 'enable_rule',
  disableRule: 'disable_rule',
  setOnlyActiveRule: 'set_only_active_rule'
}

export const AI_BRIDGE_TAB_ACTIONS = {
  reloadCapturedTab: 'reload_captured_tab'
}

const ALLOWED_ACTIONS = new Set(Object.values(AI_BRIDGE_RULE_ACTIONS))
const MAX_AFFECTED_RULES_SUMMARY = 5

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

function findRule(rules = [], ruleId = '') {
  return rules.find(rule => rule.id === ruleId) || null
}

function findCollection(collections = [], collectionId = '') {
  return collections.find(collection => collection.id === collectionId) || null
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

    const ruleId = normalizeRuleId(payload)
    if (!ruleId) {
      return createSafeActionError('INVALID_PAYLOAD', 'ruleId must be a non-empty string.')
    }

    const rules = Array.isArray(context.rules) ? context.rules : []
    const rule = findRule(rules, ruleId)
    if (!rule) {
      return createSafeActionError('RULE_NOT_FOUND', 'Rule was not found.')
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

export function getPendingAiRuleAction() {
  return aiBridgeRuleActionController.getPendingAction()
}

export function cancelPendingAiRuleAction(id) {
  return aiBridgeRuleActionController.cancelPendingAction(id)
}

export function confirmPendingAiRuleAction(id, applyAction) {
  return aiBridgeRuleActionController.confirmPendingAction(id, applyAction)
}
