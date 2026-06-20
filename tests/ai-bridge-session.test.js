import test from 'node:test'
import assert from 'node:assert/strict'

import { AI_BRIDGE_STATUS } from '../src/shared/ai-bridge-state.js'
import { createAiBridgeSessionController } from '../src/background/ai-bridge-session.js'

test('AI Bridge session controller starts disabled', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  assert.equal(controller.getSession().status, AI_BRIDGE_STATUS.disabled)
  assert.equal('token' in controller.getSession(), false)
})

test('AI Bridge session start does not mint or carry a credential', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  const session = controller.startSession()

  assert.equal(session.status, AI_BRIDGE_STATUS.waiting)
  assert.equal('token' in session, false)
  assert.equal('key' in session, false)
})

test('AI Bridge session starts with permissions copied from saved defaults', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  const session = controller.startSession({
    allowQueryValuesByDefault: true,
    allowRuleActionsByDefault: true
  })

  assert.equal(session.permissions.allowQueryValuesThisSession, true)
  assert.equal(session.permissions.allowRuleActionsThisSession, true)
  assert.equal(session.permissions.allowRequestBodyThisSession, false)
})

test('AI Bridge session permission updates do not mutate saved defaults', () => {
  const defaults = { allowQueryValuesByDefault: false }
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  controller.startSession(defaults)
  const updated = controller.updateSessionPermissions({ allowQueryValuesThisSession: true })

  assert.equal(updated.permissions.allowQueryValuesThisSession, true)
  assert.deepEqual(defaults, { allowQueryValuesByDefault: false })
})

test('AI Bridge session stop returns to disabled and clears permissions', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  controller.startSession()
  const stopped = controller.stopSession()

  assert.equal(stopped.status, AI_BRIDGE_STATUS.disabled)
  assert.equal(stopped.permissions, null)
  assert.equal(controller.getSession().status, AI_BRIDGE_STATUS.disabled)
})

test('AI Bridge session controller marks an active session connected', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  controller.startSession()
  const connected = controller.markConnected()

  assert.equal(connected.status, AI_BRIDGE_STATUS.connected)
  assert.equal(connected.connectedAt, '2026-06-19T12:00:00.000Z')
})

test('AI Bridge session controller does not mark connected without an active session', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  assert.equal(controller.markConnected().status, AI_BRIDGE_STATUS.disabled)
})

test('AI Bridge session controller marks an active session waiting after disconnect', () => {
  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  controller.startSession()
  controller.markConnected()
  const waiting = controller.markWaiting()

  assert.equal(waiting.status, AI_BRIDGE_STATUS.waiting)
  assert.equal(waiting.connectedAt, null)
})

test('AI Bridge session controller never writes to chrome.storage.local', () => {
  const writes = []
  globalThis.chrome = {
    storage: { local: { async set(value) { writes.push(value) } } }
  }

  const controller = createAiBridgeSessionController({ now: () => '2026-06-19T12:00:00.000Z' })

  controller.startSession()
  controller.stopSession()

  assert.deepEqual(writes, [])
  delete globalThis.chrome
})
