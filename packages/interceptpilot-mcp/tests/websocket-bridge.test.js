import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { createExtensionBridge } from '../src/websocket-bridge.js'

class FakeSocket extends EventEmitter {
  constructor() {
    super()
    this.sent = []
    this.closed = false
  }

  send(message) {
    this.sent.push(message)
  }

  close() {
    this.closed = true
    this.emit('close')
  }

  receive(message) {
    this.emit('message', message)
  }
}

function makeBridge(options = {}) {
  const logs = []
  const bridge = createExtensionBridge({
    logger: {
      info: message => logs.push(['info', message]),
      warn: message => logs.push(['warn', message]),
      error: message => logs.push(['error', message])
    },
    ...options
  })
  return { bridge, logs }
}

function connectExtension(bridge, key = 'stable-key-123') {
  const socket = new FakeSocket()
  bridge.handleSocket(socket)
  socket.receive(JSON.stringify({
    type: 'hello',
    source: 'interceptpilot-extension',
    key,
    version: 1
  }))
  return socket
}

test('bridge always binds WebSocket server to localhost only', () => {
  const listenOptions = []
  class FakeServer extends EventEmitter {
    constructor(options) {
      super()
      listenOptions.push(options)
    }
  }

  const { bridge } = makeBridge({
    WebSocketServerCtor: FakeServer,
    host: '0.0.0.0',
    port: 37177
  })

  bridge.start()

  assert.deepEqual(listenOptions, [{ host: '127.0.0.1', port: 37177 }])
})

test('bridge reports a clear error when extension is not connected', async () => {
  const { bridge } = makeBridge()

  await assert.rejects(
    bridge.callCommand('list_rules', {}),
    /InterceptPilot extension is not connected/
  )
})

test('bridge rejects commands outside the local allowlist', async () => {
  const { bridge } = makeBridge()
  connectExtension(bridge)

  await assert.rejects(
    bridge.callCommand('enable_rule', {}),
    /Command is not allowed/
  )
})

test('bridge forwards import_bundle command with bundleJson payload', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'req_import' })
  const socket = connectExtension(bridge)

  const pending = bridge.callCommand('import_bundle', { bundleJson: '{"schemaVersion":1}' })
  assert.deepEqual(JSON.parse(socket.sent.at(-1)), {
    id: 'req_import',
    type: 'command',
    command: 'import_bundle',
    payload: { bundleJson: '{"schemaVersion":1}' }
  })

  socket.receive(JSON.stringify({
    id: 'req_import',
    type: 'command:result',
    ok: true,
    result: { status: 'awaiting_human_confirmation', pendingImportId: 'ai-import-1' }
  }))

  assert.deepEqual(await pending, { status: 'awaiting_human_confirmation', pendingImportId: 'ai-import-1' })
})

test('bridge accepts extension hello and sends ack without logging the key', () => {
  const { bridge, logs } = makeBridge()
  const socket = connectExtension(bridge)

  assert.equal(bridge.isConnected(), true)
  assert.deepEqual(JSON.parse(socket.sent[0]), {
    type: 'hello:ack',
    ok: true,
    version: 1
  })
  assert.doesNotMatch(JSON.stringify(logs), /stable-key-123/)
})

test('bridge rejects extension hello with an old key without logging key values', () => {
  const { bridge, logs } = makeBridge({ expectedKey: 'new-key-456' })
  const socket = connectExtension(bridge, 'old-key-123')

  assert.equal(bridge.isConnected(), false)
  assert.equal(socket.closed, true)
  assert.doesNotMatch(JSON.stringify(socket.sent), /old-key-123|new-key-456/)
  assert.doesNotMatch(JSON.stringify(logs), /old-key-123|new-key-456/)
})

test('bridge forwards allowed command and resolves by matching id', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'req_test' })
  const socket = connectExtension(bridge)

  const pending = bridge.callCommand('list_rules', {})
  assert.deepEqual(JSON.parse(socket.sent.at(-1)), {
    id: 'req_test',
    type: 'command',
    command: 'list_rules',
    payload: {}
  })

  socket.receive(JSON.stringify({ id: 'other_req', type: 'command:result', ok: true, result: ['wrong'] }))
  socket.receive(JSON.stringify({ id: 'req_test', type: 'command:result', ok: true, result: ['ok'] }))

  assert.deepEqual(await pending, ['ok'])
})

test('bridge rejects new commands when too many requests are pending', async () => {
  let requestSeq = 0
  const { bridge } = makeBridge({
    idGenerator: () => {
      requestSeq += 1
      return `req_${requestSeq}`
    },
    maxPendingRequests: 1
  })
  const socket = connectExtension(bridge)

  const first = bridge.callCommand('list_rules', {})
  assert.equal(bridge.getPendingCount(), 1)

  await assert.rejects(
    bridge.callCommand('list_collections', {}),
    /Too many pending InterceptPilot requests/
  )
  assert.equal(bridge.getPendingCount(), 1)

  socket.receive(JSON.stringify({ id: 'req_1', type: 'command:result', ok: true, result: ['ok'] }))
  assert.deepEqual(await first, ['ok'])
  assert.equal(bridge.getPendingCount(), 0)
})

test('bridge timeout rejects safely and clears pending request', async () => {
  let timeoutFn = null
  const { bridge } = makeBridge({
    idGenerator: () => 'req_timeout',
    setTimeoutFn: fn => {
      timeoutFn = fn
      return 'timer-1'
    },
    clearTimeoutFn: () => {}
  })
  connectExtension(bridge)

  const pending = bridge.callCommand('list_rules', {})
  assert.equal(bridge.getPendingCount(), 1)
  timeoutFn()

  await assert.rejects(pending, /InterceptPilot did not respond in time/)
  assert.equal(bridge.getPendingCount(), 0)
})

test('bridge accepts hello using the preferred key field and expectedKey', () => {
  const { bridge } = makeBridge({ expectedKey: 'stable-key-123' })
  const socket = new FakeSocket()
  bridge.handleSocket(socket)
  socket.receive(JSON.stringify({
    type: 'hello',
    source: 'interceptpilot-extension',
    key: 'stable-key-123',
    version: 1
  }))

  assert.equal(bridge.isConnected(), true)
})

test('bridge sends a heartbeat ping on the interval and ignores pong', () => {
  let tick = null
  const { bridge } = makeBridge({
    heartbeatIntervalMs: 1000,
    setIntervalFn: fn => { tick = fn; return 1 },
    clearIntervalFn: () => { tick = null }
  })
  const socket = connectExtension(bridge)
  socket.sent.length = 0

  tick()
  assert.deepEqual(JSON.parse(socket.sent.at(-1)), { type: 'ping' })

  assert.doesNotThrow(() => socket.receive(JSON.stringify({ type: 'pong' })))
  assert.equal(bridge.isConnected(), true)
})

test('bridge stops the heartbeat when the extension disconnects', () => {
  let cleared = false
  const { bridge } = makeBridge({
    heartbeatIntervalMs: 1000,
    setIntervalFn: () => 'timer-1',
    clearIntervalFn: () => { cleared = true }
  })
  const socket = connectExtension(bridge)

  socket.close()
  assert.equal(cleared, true)
})

test('bridge clears pending requests when extension disconnects', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'req_disconnect' })
  const socket = connectExtension(bridge)

  const pending = bridge.callCommand('list_rules', {})
  assert.equal(bridge.getPendingCount(), 1)
  socket.close()

  await assert.rejects(pending, /InterceptPilot extension disconnected/)
  assert.equal(bridge.isConnected(), false)
  assert.equal(bridge.getPendingCount(), 0)
})
