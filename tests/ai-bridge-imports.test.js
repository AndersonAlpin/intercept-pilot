import test from 'node:test'
import assert from 'node:assert/strict'

import {
  cancelPendingAiImport,
  confirmPendingAiImport,
  createAiBridgeImportController,
  createPendingAiImport
} from '../src/background/ai-bridge-imports.js'

const collectionBundleJson = JSON.stringify({
  schemaVersion: 1,
  type: 'interceptpilot.collection',
  collection: {
    id: 'collection-ai',
    name: 'AI Checkout',
    description: 'AI proposed scenarios',
    enabled: true
  },
  rules: [
    {
      id: 'rule-ai-1',
      name: 'Checkout 500',
      collectionId: 'collection-ai',
      match: { urlPattern: '/checkout', matchType: 'contains', method: 'GET', resourceType: 'ANY' },
      action: { type: 'mockResponse', statusCode: 500, contentType: 'application/json' }
    }
  ]
})

test('AI import controller creates a pending proposal without applying bundle', () => {
  const applied = []
  const controller = createAiBridgeImportController({
    now: () => '2026-06-19T12:00:00.000Z',
    idGenerator: () => 'ai-import-1',
    applyImport: async bundle => applied.push(bundle)
  })

  const result = controller.createPendingImport({ bundleJson: collectionBundleJson })

  assert.equal(result.status, 'awaiting_human_confirmation')
  assert.equal(result.pendingImportId, 'ai-import-1')
  assert.deepEqual(result.summary, {
    type: 'interceptpilot.collection',
    collectionName: 'AI Checkout',
    ruleCount: 1,
    conflict: null
  })
  assert.equal(controller.getPendingImport().id, 'ai-import-1')
  assert.deepEqual(applied, [])
})

test('AI import controller returns safe errors for invalid JSON and invalid bundle', () => {
  const controller = createAiBridgeImportController()

  assert.deepEqual(controller.createPendingImport({ bundleJson: '{bad json' }), {
    error: { code: 'INVALID_JSON', message: 'Import bundle JSON is invalid.' }
  })
  assert.deepEqual(controller.createPendingImport({ bundleJson: '{"schemaVersion":1,"type":"unknown"}' }), {
    error: { code: 'INVALID_BUNDLE', message: 'Import bundle is not supported.' }
  })
})

test('AI import controller rejects oversized bundles safely', () => {
  const controller = createAiBridgeImportController()
  const oversizedBundle = 'x'.repeat((256 * 1024) + 1)

  assert.deepEqual(controller.createPendingImport({ bundleJson: oversizedBundle }), {
    error: { code: 'BUNDLE_TOO_LARGE', message: 'Import bundle is too large.' }
  })
})

test('AI import controller rejects a new proposal while another is pending', () => {
  const controller = createAiBridgeImportController({
    idGenerator: () => 'ai-import-1'
  })

  const first = controller.createPendingImport({ bundleJson: collectionBundleJson })
  const second = controller.createPendingImport({ bundleJson: collectionBundleJson })

  assert.equal(first.status, 'awaiting_human_confirmation')
  assert.deepEqual(second, {
    error: {
      code: 'PENDING_IMPORT_EXISTS',
      message: 'Another import proposal is already pending.'
    }
  })
  assert.equal(controller.getPendingImport().id, 'ai-import-1')
})

test('AI import controller cancels pending proposal without applying bundle', async () => {
  const applied = []
  const controller = createAiBridgeImportController({
    idGenerator: () => 'ai-import-1',
    applyImport: async bundle => applied.push(bundle)
  })

  controller.createPendingImport({ bundleJson: collectionBundleJson })
  const result = controller.cancelPendingImport('ai-import-1')

  assert.deepEqual(result, { ok: true, pendingImport: null })
  assert.equal(controller.getPendingImport(), null)
  assert.deepEqual(applied, [])
})

test('AI import controller confirms pending proposal through provided import flow', async () => {
  const applied = []
  const controller = createAiBridgeImportController({
    idGenerator: () => 'ai-import-1',
    applyImport: async bundle => {
      applied.push(bundle)
      return { ok: true }
    }
  })

  controller.createPendingImport({ bundleJson: collectionBundleJson })
  const result = await controller.confirmPendingImport('ai-import-1')

  assert.deepEqual(result, { ok: true, pendingImport: null })
  assert.equal(controller.getPendingImport(), null)
  assert.equal(applied.length, 1)
  assert.equal(applied[0].collection.name, 'AI Checkout')
})

test('default AI import singleton can create, cancel and confirm pending import', async () => {
  const created = createPendingAiImport({ bundleJson: collectionBundleJson })
  assert.equal(created.status, 'awaiting_human_confirmation')

  const canceled = cancelPendingAiImport(created.pendingImportId)
  assert.equal(canceled.ok, true)

  const next = createPendingAiImport({ bundleJson: collectionBundleJson })
  const confirmed = await confirmPendingAiImport(next.pendingImportId, async () => ({ ok: true }))
  assert.equal(confirmed.ok, true)
})
