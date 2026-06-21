import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_BRIDGE_RULE_ACTIONS,
  cancelPendingAiRuleAction,
  confirmPendingAiRuleAction,
  createAiBridgeRuleActionController,
  createPendingAiRuleAction
} from '../src/background/ai-bridge-actions.js'

const baseCollections = [
  { id: 'collection-1', name: 'Checkout', enabled: true },
  { id: 'collection-2', name: 'Account', enabled: true }
]

const baseRules = [
  {
    id: 'rule-1',
    name: 'Checkout 200',
    collectionId: 'collection-1',
    enabled: false,
    priority: 100,
    match: { urlPattern: '/checkout', matchType: 'contains', method: 'GET', resourceType: 'Fetch' },
    action: { type: 'mockResponse', statusCode: 200, statusText: 'OK', contentType: 'application/json', delayMs: 0, failReason: 'Failed', responseBody: '{"secret":true}' }
  },
  { id: 'rule-2', name: 'Checkout 500', collectionId: 'collection-1', enabled: true },
  { id: 'rule-3', name: 'Checkout timeout', collectionId: 'collection-1', enabled: true },
  { id: 'rule-4', name: 'Account 401', collectionId: 'collection-2', enabled: true }
]

function createController(options = {}) {
  return createAiBridgeRuleActionController({
    now: () => '2026-06-20T12:00:00.000Z',
    idGenerator: () => 'ai-action-1',
    ...options
  })
}

test('AI rule action controller creates a pending enable proposal without applying it', () => {
  const applied = []
  const controller = createController({
    applyAction: async action => applied.push(action)
  })

  const result = controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.pendingActionId, 'ai-action-1')
  assert.equal(result.action, AI_BRIDGE_RULE_ACTIONS.enableRule)
  assert.deepEqual(result.summary, {
    ruleId: 'rule-1',
    ruleName: 'Checkout 200',
    collectionId: 'collection-1',
    collectionName: 'Checkout',
    affectedRuleCount: 0,
    affectedRules: []
  })
  assert.equal(controller.getPendingAction().id, 'ai-action-1')
  assert.deepEqual(applied, [])
})

test('AI rule action controller creates a pending disable proposal', () => {
  const controller = createController()

  const result = controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.disableRule, { ruleId: 'rule-2' }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, AI_BRIDGE_RULE_ACTIONS.disableRule)
  assert.equal(result.summary.ruleName, 'Checkout 500')
  assert.equal(result.summary.collectionName, 'Checkout')
})

test('AI rule action controller creates set only active proposal with same-collection impact', () => {
  const controller = createController()

  const result = controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.setOnlyActiveRule, { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, AI_BRIDGE_RULE_ACTIONS.setOnlyActiveRule)
  assert.equal(result.summary.ruleName, 'Checkout 200')
  assert.equal(result.summary.affectedRuleCount, 2)
  assert.deepEqual(result.summary.affectedRules, [
    { id: 'rule-2', name: 'Checkout 500' },
    { id: 'rule-3', name: 'Checkout timeout' }
  ])
})

test('AI rule action controller returns safe errors for invalid action, payload and missing rule', () => {
  const controller = createController()
  const context = { rules: baseRules, collections: baseCollections }

  assert.deepEqual(controller.createPendingAction('unknown_action', { ruleId: 'rule-1' }, context), {
    error: { code: 'UNKNOWN_ACTION', message: 'Rule action is not allowed.' }
  })
  assert.deepEqual(controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, {}, context), {
    error: { code: 'INVALID_PAYLOAD', message: 'ruleId must be a non-empty string.' }
  })
  assert.deepEqual(controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'missing' }, context), {
    error: { code: 'RULE_NOT_FOUND', message: 'Rule was not found.' }
  })
})

test('AI rule update proposal includes a safe diff and waits for confirmation', () => {
  const controller = createController()

  const result = controller.createPendingAction('update_rule', {
    ruleId: 'rule-1',
    patch: {
      match: { resourceType: 'ANY' },
      priority: 300
    },
    reason: 'The captured request is XHR and the rule currently targets Fetch.'
  }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'update_rule')
  assert.deepEqual(result.summary.diff, [
    { field: 'match.resourceType', before: 'Fetch', after: 'ANY' },
    { field: 'priority', before: 100, after: 300 }
  ])
  assert.equal(result.summary.reason, 'The captured request is XHR and the rule currently targets Fetch.')
  assert.equal(controller.getPendingAction().summary.ruleId, 'rule-1')
})

test('AI collection update proposal includes a safe diff and waits for confirmation', () => {
  const controller = createController()

  const result = controller.createPendingAction('update_collection', {
    collectionId: 'collection-1',
    patch: {
      name: 'Checkout updated',
      description: 'Regression scenarios'
    },
    reason: 'Make the collection purpose clearer.'
  }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'update_collection')
  assert.deepEqual(result.summary.diff, [
    { field: 'name', before: 'Checkout', after: 'Checkout updated' },
    { field: 'description', before: '', after: 'Regression scenarios' }
  ])
  assert.equal(result.summary.collectionId, 'collection-1')
})

test('AI set active collection proposal summarizes current and next collection', () => {
  const controller = createController({ idGenerator: () => 'ai-active-collection' })

  const result = controller.createPendingAction('set_active_collection', {
    collectionId: 'collection-2'
  }, {
    rules: baseRules,
    collections: baseCollections,
    settings: { activeCollectionId: 'collection-1' }
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'set_active_collection')
  assert.equal(result.pendingActionId, 'ai-active-collection')
  assert.deepEqual(result.summary, {
    collectionId: 'collection-2',
    collectionName: 'Account',
    previousCollectionId: 'collection-1',
    previousCollectionName: 'Checkout'
  })
})

test('AI update proposals reject unsafe fields without exposing payload details', () => {
  const controller = createController()
  const result = controller.createPendingAction('update_rule', {
    ruleId: 'rule-1',
    patch: {
      action: {
        responseBody: '{"token":"secret"}'
      }
    }
  }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.deepEqual(result, {
    error: { code: 'UNSAFE_UPDATE_FIELD', message: 'Requested update field is not allowed.' }
  })
  assert.doesNotMatch(JSON.stringify(result), /secret|responseBody|token/)
})

test('AI delete rule proposal waits for confirmation and summarizes the rule', () => {
  const controller = createController({ idGenerator: () => 'ai-delete-rule' })

  const result = controller.createPendingAction('delete_rule', { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'delete_rule')
  assert.equal(result.pendingActionId, 'ai-delete-rule')
  assert.deepEqual(result.summary, {
    ruleId: 'rule-1',
    ruleName: 'Checkout 200',
    collectionId: 'collection-1',
    collectionName: 'Checkout'
  })
})

test('AI delete collection proposal includes affected rule count', () => {
  const controller = createController({ idGenerator: () => 'ai-delete-collection' })

  const result = controller.createPendingAction('delete_collection', { collectionId: 'collection-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'delete_collection')
  assert.equal(result.summary.collectionId, 'collection-1')
  assert.equal(result.summary.affectedRuleCount, 3)
  assert.deepEqual(result.summary.affectedRules, [
    { id: 'rule-1', name: 'Checkout 200' },
    { id: 'rule-2', name: 'Checkout 500' },
    { id: 'rule-3', name: 'Checkout timeout' }
  ])
})

test('AI rule action controller rejects concurrent pending proposals', () => {
  const controller = createController()
  const context = { rules: baseRules, collections: baseCollections }

  const first = controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, context)
  const second = controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.disableRule, { ruleId: 'rule-2' }, context)
  const blockedByImport = createController().createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, {
    ...context,
    hasPendingImport: true
  })

  assert.equal(first.status, 'awaiting_human_confirmation')
  assert.deepEqual(second, {
    error: { code: 'PENDING_PROPOSAL_EXISTS', message: 'Another AI Bridge proposal is already pending.' }
  })
  assert.deepEqual(blockedByImport, {
    error: { code: 'PENDING_PROPOSAL_EXISTS', message: 'Another AI Bridge proposal is already pending.' }
  })
})

test('AI rule action controller cancels without applying', () => {
  const applied = []
  const controller = createController({
    applyAction: async action => applied.push(action)
  })
  controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  const result = controller.cancelPendingAction('ai-action-1')

  assert.deepEqual(result, { ok: true, pendingAction: null })
  assert.equal(controller.getPendingAction(), null)
  assert.deepEqual(applied, [])
})

test('AI rule action controller confirms using provided apply flow', async () => {
  const applied = []
  const controller = createController({
    applyAction: async action => {
      applied.push(action)
      return { ok: true, rules: [] }
    }
  })
  controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })

  const result = await controller.confirmPendingAction('ai-action-1')

  assert.deepEqual(result, { ok: true, pendingAction: null, rules: [] })
  assert.equal(controller.getPendingAction(), null)
  assert.equal(applied[0].action, AI_BRIDGE_RULE_ACTIONS.enableRule)
  assert.equal(applied[0].summary.ruleId, 'rule-1')
})

test('AI rule action apply helpers update only intended rules', async () => {
  let rules = structuredClone(baseRules)
  const controller = createController({
    applyAction: async pendingAction => {
      if (pendingAction.action === AI_BRIDGE_RULE_ACTIONS.enableRule) {
        rules = rules.map(rule => rule.id === pendingAction.summary.ruleId ? { ...rule, enabled: true } : rule)
      }
      if (pendingAction.action === AI_BRIDGE_RULE_ACTIONS.disableRule) {
        rules = rules.map(rule => rule.id === pendingAction.summary.ruleId ? { ...rule, enabled: false } : rule)
      }
      if (pendingAction.action === AI_BRIDGE_RULE_ACTIONS.setOnlyActiveRule) {
        rules = rules.map(rule => (
          rule.collectionId === pendingAction.summary.collectionId
            ? { ...rule, enabled: rule.id === pendingAction.summary.ruleId }
            : rule
        ))
      }
      return { ok: true, rules }
    }
  })

  controller.createPendingAction(AI_BRIDGE_RULE_ACTIONS.setOnlyActiveRule, { ruleId: 'rule-1' }, {
    rules,
    collections: baseCollections
  })
  await controller.confirmPendingAction('ai-action-1')

  assert.equal(rules.find(rule => rule.id === 'rule-1').enabled, true)
  assert.equal(rules.find(rule => rule.id === 'rule-2').enabled, false)
  assert.equal(rules.find(rule => rule.id === 'rule-3').enabled, false)
  assert.equal(rules.find(rule => rule.id === 'rule-4').enabled, true)
})

test('default AI rule action singleton can create, cancel and confirm pending action', async () => {
  const created = createPendingAiRuleAction(AI_BRIDGE_RULE_ACTIONS.enableRule, { ruleId: 'rule-1' }, {
    rules: baseRules,
    collections: baseCollections
  })
  assert.equal(created.status, 'awaiting_human_confirmation')

  const canceled = cancelPendingAiRuleAction(created.pendingActionId)
  assert.equal(canceled.ok, true)

  const next = createPendingAiRuleAction(AI_BRIDGE_RULE_ACTIONS.disableRule, { ruleId: 'rule-2' }, {
    rules: baseRules,
    collections: baseCollections
  })
  const confirmed = await confirmPendingAiRuleAction(next.pendingActionId, async () => ({ ok: true, rules: baseRules }))
  assert.equal(confirmed.ok, true)
})

test('AI reload proposal captures the tab origin/path and waits for confirmation', () => {
  const controller = createAiBridgeRuleActionController({
    idGenerator: () => 'ai-action-reload',
    now: () => '2026-06-20T10:00:00.000Z'
  })

  const result = controller.createReloadProposal({
    capturedTab: { tabId: 7, origin: 'https://app.test', path: '/videos' }
  })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.action, 'reload_captured_tab')
  assert.deepEqual(result.summary, { origin: 'https://app.test', path: '/videos' })
  assert.equal(controller.getPendingAction().action, 'reload_captured_tab')
})

test('AI reload proposal fails without a captured tab', () => {
  const controller = createAiBridgeRuleActionController()
  const result = controller.createReloadProposal({ capturedTab: null })
  assert.equal(result.error.code, 'CAPTURED_TAB_NOT_FOUND')
})

test('AI reload proposal is blocked while another proposal is pending', () => {
  const controller = createAiBridgeRuleActionController({ idGenerator: () => 'ai-action-reload' })
  controller.createReloadProposal({ capturedTab: { tabId: 1, origin: 'https://a.test', path: '/' } })
  const second = controller.createReloadProposal({ capturedTab: { tabId: 1, origin: 'https://a.test', path: '/' } })
  assert.equal(second.error.code, 'PENDING_PROPOSAL_EXISTS')
})

test('AI reload proposal confirm runs the provided apply function', async () => {
  const controller = createAiBridgeRuleActionController({ idGenerator: () => 'ai-action-reload' })
  controller.createReloadProposal({ capturedTab: { tabId: 9, origin: 'https://a.test', path: '/x' } })
  let applied = false
  const confirmed = await controller.confirmPendingAction('ai-action-reload', async () => { applied = true; return { ok: true } })
  assert.equal(applied, true)
  assert.equal(confirmed.ok, true)
  assert.equal(controller.getPendingAction(), null)
})
