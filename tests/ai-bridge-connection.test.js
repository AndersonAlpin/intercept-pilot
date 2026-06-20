import test from 'node:test'
import assert from 'node:assert/strict'

import { AI_BRIDGE_STATUS, createAiBridgeSessionState } from '../src/shared/ai-bridge-state.js'
import { createAiBridgeConnection } from '../src/background/ai-bridge-connection.js'

class FakeWebSocket {
  static instances = []

  constructor(url) {
    this.url = url
    this.sent = []
    this.closed = false
    FakeWebSocket.instances.push(this)
  }

  send(message) {
    this.sent.push(message)
  }

  close() {
    this.closed = true
    this.onclose?.({})
  }

  open() {
    this.onopen?.({})
  }

  receive(data) {
    this.onmessage?.({ data })
  }
}

function makeHarness(session) {
  let currentSession = session
  const changes = []
  const timers = []
  const connection = createAiBridgeConnection({
    WebSocketCtor: FakeWebSocket,
    getSession: () => currentSession,
    markConnected: () => {
      currentSession = { ...currentSession, status: AI_BRIDGE_STATUS.connected, connectedAt: '2026-06-19T12:01:00.000Z' }
      return currentSession
    },
    markWaiting: () => {
      currentSession = { ...currentSession, status: AI_BRIDGE_STATUS.waiting, connectedAt: null }
      return currentSession
    },
    getCommandContext: async () => ({
      state: {
        attachedTabId: 42,
        networkMeta: { currentCaptureSessionId: 'session-1' },
        collections: [{ id: 'collection-1', name: 'Main', enabled: true, order: 0 }],
        rules: [],
        settings: { activeCollectionId: 'collection-1' }
      },
      networkEntries: [
        {
          id: 'entry-1',
          networkTabId: 42,
          captureSessionId: 'session-1',
          url: 'https://example.test/api?token=secret',
          method: 'GET',
          requestHeaders: [{ name: 'Authorization', value: 'Bearer secret' }],
          responseBody: '{"secret":true}'
        }
      ]
    }),
    onSessionChange: next => changes.push(next),
    setTimeoutFn: fn => {
      timers.push(fn)
      return timers.length
    },
    clearTimeoutFn: () => {}
  })
  return {
    connection,
    get session() {
      return currentSession
    },
    changes,
    timers
  }
}

test('AI Bridge connection does not connect while session is disabled', () => {
  FakeWebSocket.instances = []
  const harness = makeHarness(createAiBridgeSessionState())

  harness.connection.sync()

  assert.equal(FakeWebSocket.instances.length, 0)
})

test('AI Bridge connection opens localhost WebSocket and sends token handshake', () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: null
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.open()

  assert.equal(socket.url, 'ws://127.0.0.1:37177')
  assert.deepEqual(JSON.parse(socket.sent[0]), {
    type: 'hello',
    source: 'interceptpilot-extension',
    token: 'pairing-token-123',
    version: 1
  })
})

test('AI Bridge connection marks session connected after hello ack', () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: null
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.open()
  socket.receive(JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }))

  assert.equal(harness.session.status, AI_BRIDGE_STATUS.connected)
  assert.equal(harness.changes.at(-1).status, AI_BRIDGE_STATUS.connected)
})

test('AI Bridge connection ignores invalid JSON without leaking token', () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: null
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.open()
  const sentBeforeInvalidMessage = socket.sent.length
  socket.receive('{bad json')

  assert.equal(socket.sent.length, sentBeforeInvalidMessage)
  assert.doesNotMatch(JSON.stringify(socket.sent.slice(sentBeforeInvalidMessage)), /pairing-token-123/)
})

test('AI Bridge connection rejects unknown commands with safe error', async () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.connected,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: '2026-06-19T12:01:00.000Z'
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.receive(JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }))
  socket.receive(JSON.stringify({ id: 'req-1', type: 'command', command: 'enable_rule', payload: {} }))
  await Promise.resolve()

  assert.deepEqual(JSON.parse(socket.sent.at(-1)), {
    id: 'req-1',
    type: 'command:error',
    ok: false,
    error: {
      code: 'UNKNOWN_COMMAND',
      message: 'Command is not allowed.'
    }
  })
})

test('AI Bridge connection routes import_bundle command through write proposal handler', async () => {
  FakeWebSocket.instances = []
  const proposedImports = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.connected,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: '2026-06-19T12:01:00.000Z'
  })
  const connection = createAiBridgeConnection({
    WebSocketCtor: FakeWebSocket,
    getSession: () => harness.session,
    markConnected: () => harness.session,
    markWaiting: () => harness.session,
    getCommandContext: async () => ({}),
    importBundle: async payload => {
      proposedImports.push(payload)
      return { status: 'awaiting_human_confirmation', pendingImportId: 'ai-import-1' }
    },
    setTimeoutFn: fn => {
      harness.timers.push(fn)
      return harness.timers.length
    },
    clearTimeoutFn: () => {}
  })

  connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.receive(JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }))
  socket.receive(JSON.stringify({ id: 'req-import', type: 'command', command: 'import_bundle', payload: { bundleJson: '{"schemaVersion":1}' } }))
  await Promise.resolve()

  assert.deepEqual(proposedImports, [{ bundleJson: '{"schemaVersion":1}' }])
  assert.deepEqual(JSON.parse(socket.sent.at(-1)), {
    id: 'req-import',
    type: 'command:result',
    ok: true,
    result: { status: 'awaiting_human_confirmation', pendingImportId: 'ai-import-1' }
  })
})

test('AI Bridge connection returns safe error when import_bundle is rejected', async () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.connected,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: '2026-06-19T12:01:00.000Z'
  })
  const connection = createAiBridgeConnection({
    WebSocketCtor: FakeWebSocket,
    getSession: () => harness.session,
    markConnected: () => harness.session,
    markWaiting: () => harness.session,
    getCommandContext: async () => ({}),
    importBundle: async () => ({
      error: {
        code: 'INVALID_JSON',
        message: 'Import bundle JSON is invalid.'
      }
    }),
    setTimeoutFn: fn => {
      harness.timers.push(fn)
      return harness.timers.length
    },
    clearTimeoutFn: () => {}
  })

  connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.receive(JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }))
  socket.receive(JSON.stringify({ id: 'req-import', type: 'command', command: 'import_bundle', payload: { bundleJson: '{bad json' } }))
  await Promise.resolve()

  assert.deepEqual(JSON.parse(socket.sent.at(-1)), {
    id: 'req-import',
    type: 'command:error',
    ok: false,
    error: {
      code: 'INVALID_JSON',
      message: 'Import bundle JSON is invalid.'
    }
  })
})

test('AI Bridge connection ignores commands before hello ack', async () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: null
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.open()
  socket.receive(JSON.stringify({ id: 'req-before-ack', type: 'command', command: 'list_rules', payload: {} }))
  await Promise.resolve()

  assert.equal(socket.sent.length, 1)
})

test('AI Bridge connection executes allowed read-only commands with sanitized results', async () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.connected,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: '2026-06-19T12:01:00.000Z'
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]
  socket.receive(JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }))
  socket.receive(JSON.stringify({ id: 'req-2', type: 'command', command: 'list_captured_requests', payload: {} }))
  await Promise.resolve()

  const response = JSON.parse(socket.sent.at(-1))
  assert.equal(response.id, 'req-2')
  assert.equal(response.type, 'command:result')
  assert.equal(response.ok, true)
  assert.equal(response.result[0].urlSanitized, 'https://example.test/api')
  assert.deepEqual(response.result[0].queryKeys, ['token'])
  assert.equal(response.result[0].requestHeadersPresent, true)
  assert.equal(response.result[0].responseBodyPresent, true)
  assert.doesNotMatch(JSON.stringify(response), /secret|Authorization|"requestHeaders":|"responseBody":/)
})

test('AI Bridge connection closes socket and cancels reconnect on disconnect', () => {
  FakeWebSocket.instances = []
  const harness = makeHarness({
    status: AI_BRIDGE_STATUS.connected,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: '2026-06-19T12:01:00.000Z'
  })

  harness.connection.sync()
  const socket = FakeWebSocket.instances[0]

  harness.connection.disconnect()

  assert.equal(socket.closed, true)
  assert.equal(harness.timers.length, 0)
})
