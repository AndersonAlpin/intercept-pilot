import test from 'node:test'
import assert from 'node:assert/strict'

import { AI_BRIDGE_STATUS } from '../src/shared/ai-bridge-state.js'
import { createAiBridgeSessionController } from '../src/background/ai-bridge-session.js'

test('AI Bridge session controller starts disabled', () => {
  const controller = createAiBridgeSessionController({
    tokenGenerator: () => 'token-a',
    now: () => '2026-06-19T12:00:00.000Z'
  })

  assert.equal(controller.getSession().status, AI_BRIDGE_STATUS.disabled)
  assert.equal(controller.getSession().token, '')
})

test('AI Bridge session controller generates a token for each started session', () => {
  const tokens = ['token-a', 'token-b']
  const controller = createAiBridgeSessionController({
    tokenGenerator: () => tokens.shift(),
    now: () => '2026-06-19T12:00:00.000Z'
  })

  const first = controller.startSession()
  const second = controller.startSession()

  assert.equal(first.status, AI_BRIDGE_STATUS.waiting)
  assert.equal(first.token, 'token-a')
  assert.equal(second.status, AI_BRIDGE_STATUS.waiting)
  assert.equal(second.token, 'token-b')
  assert.notEqual(first.token, second.token)
})

test('AI Bridge session controller revokes token and returns to disabled', () => {
  const controller = createAiBridgeSessionController({
    tokenGenerator: () => 'token-a',
    now: () => '2026-06-19T12:00:00.000Z'
  })

  controller.startSession()
  const revoked = controller.revokeSession()

  assert.equal(revoked.status, AI_BRIDGE_STATUS.disabled)
  assert.equal(revoked.token, '')
  assert.equal(controller.getSession().status, AI_BRIDGE_STATUS.disabled)
})

test('AI Bridge session controller marks an active session connected without changing token', () => {
  const controller = createAiBridgeSessionController({
    tokenGenerator: () => 'token-a',
    now: () => '2026-06-19T12:00:00.000Z'
  })

  controller.startSession()
  const connected = controller.markConnected()

  assert.equal(connected.status, AI_BRIDGE_STATUS.connected)
  assert.equal(connected.token, 'token-a')
  assert.equal(connected.connectedAt, '2026-06-19T12:00:00.000Z')
})

test('AI Bridge session controller marks an active session waiting after disconnect', () => {
  const controller = createAiBridgeSessionController({
    tokenGenerator: () => 'token-a',
    now: () => '2026-06-19T12:00:00.000Z'
  })

  controller.startSession()
  controller.markConnected()
  const waiting = controller.markWaiting()

  assert.equal(waiting.status, AI_BRIDGE_STATUS.waiting)
  assert.equal(waiting.token, 'token-a')
  assert.equal(waiting.connectedAt, null)
})

test('AI Bridge session controller never writes token to chrome.storage.local', () => {
  const writes = []
  globalThis.chrome = {
    storage: {
      local: {
        async set(value) {
          writes.push(value)
        }
      }
    }
  }

  const controller = createAiBridgeSessionController({
    tokenGenerator: () => 'token-a',
    now: () => '2026-06-19T12:00:00.000Z'
  })

  controller.startSession()
  controller.revokeSession()

  assert.deepEqual(writes, [])
  delete globalThis.chrome
})
