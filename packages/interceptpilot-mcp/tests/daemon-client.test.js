import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { createDaemonClientBridge } from '../src/daemon-client.js'

class FakeWebSocket extends EventEmitter {
  constructor(url) {
    super()
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
    this.emit('close')
  }

  open() {
    this.emit('open')
  }

  fail(message = 'connect ECONNREFUSED') {
    this.emit('error', new Error(message))
    this.close()
  }

  receive(message) {
    this.emit('message', message)
  }
}

FakeWebSocket.instances = []

function resetSockets() {
  FakeWebSocket.instances = []
}

function lastSent(socket) {
  return JSON.parse(socket.sent.at(-1))
}

function makeBridge(options = {}) {
  resetSockets()
  const logs = []
  const bridge = createDaemonClientBridge({
    WebSocketCtor: FakeWebSocket,
    port: 37177,
    expectedKey: 'stable-key-123',
    logger: {
      info: message => logs.push(['info', message]),
      warn: message => logs.push(['warn', message]),
      error: message => logs.push(['error', message])
    },
    ...options
  })
  return { bridge, logs }
}

async function connectBridge(bridge) {
  const pending = bridge.start()
  const socket = FakeWebSocket.instances.at(-1)
  socket.open()
  socket.receive(JSON.stringify({ type: 'client:hello:ack', ok: true, version: 1 }))
  await pending
  return socket
}

test('daemon client sends client hello with key and never logs the key', async () => {
  const { bridge, logs } = makeBridge()
  const socket = await connectBridge(bridge)

  assert.deepEqual(lastSent(socket), {
    type: 'client:hello',
    source: 'interceptpilot-mcp-client',
    key: 'stable-key-123',
    version: 1,
    clientId: 'interceptpilot-mcp'
  })
  assert.equal(bridge.isConnected(), true)
  assert.doesNotMatch(JSON.stringify(logs), /stable-key-123/)
})

test('daemon client resolves callCommand from client result messages', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'client-req-1' })
  const socket = await connectBridge(bridge)

  const pending = bridge.callCommand('list_rules', {})
  assert.deepEqual(lastSent(socket), {
    id: 'client-req-1',
    type: 'client:command',
    command: 'list_rules',
    payload: {}
  })

  socket.receive(JSON.stringify({
    id: 'client-req-1',
    type: 'client:result',
    ok: true,
    result: ['ok']
  }))

  assert.deepEqual(await pending, ['ok'])
  assert.equal(bridge.getPendingCount(), 0)
})

test('daemon client rejects unknown commands locally without sending them', async () => {
  const { bridge } = makeBridge()
  const socket = await connectBridge(bridge)
  socket.sent.length = 0

  await assert.rejects(
    bridge.callCommand('delete_everything', {}),
    /Command is not allowed/
  )
  assert.deepEqual(socket.sent, [])
})

test('daemon client reports extension not connected with existing safe message', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'client-req-1' })
  const socket = await connectBridge(bridge)

  const pending = bridge.callCommand('list_rules', {})
  socket.receive(JSON.stringify({
    id: 'client-req-1',
    type: 'client:error',
    ok: false,
    error: {
      code: 'EXTENSION_NOT_CONNECTED',
      message: 'InterceptPilot extension is not connected. Open InterceptPilot settings and start an AI Bridge session.'
    }
  }))

  await assert.rejects(pending, /InterceptPilot extension is not connected/)
})

test('daemon client times out pending requests and clears pending state', async () => {
  let timeoutFn = null
  const { bridge } = makeBridge({
    idGenerator: () => 'client-req-1',
    setTimeoutFn: fn => {
      timeoutFn = fn
      return 'timer-1'
    },
    clearTimeoutFn: () => {}
  })
  await connectBridge(bridge)

  const pending = bridge.callCommand('list_rules', {})
  assert.equal(bridge.getPendingCount(), 1)
  timeoutFn()

  await assert.rejects(pending, /InterceptPilot did not respond in time/)
  assert.equal(bridge.getPendingCount(), 0)
})

test('daemon client rejects pending requests when daemon socket closes', async () => {
  const { bridge } = makeBridge({ idGenerator: () => 'client-req-1' })
  const socket = await connectBridge(bridge)

  const pending = bridge.callCommand('list_rules', {})
  socket.close()

  await assert.rejects(pending, /InterceptPilot daemon disconnected/)
  assert.equal(bridge.getPendingCount(), 0)
  assert.equal(bridge.isConnected(), false)
})

test('daemon client starts daemon when initial connection fails', async () => {
  let starts = 0
  const { bridge } = makeBridge({
    startDaemonProcess: () => { starts += 1 },
    retryDelayMs: 0
  })

  const pending = bridge.start()
  FakeWebSocket.instances[0].fail()
  assert.equal(starts, 1)
  FakeWebSocket.instances[1].open()
  FakeWebSocket.instances[1].receive(JSON.stringify({ type: 'client:hello:ack', ok: true, version: 1 }))

  await pending
  assert.equal(bridge.isConnected(), true)
})

test('daemon client does not start daemon when daemonAutostart is false', async () => {
  let starts = 0
  const { bridge, logs } = makeBridge({
    daemonAutostart: false,
    startDaemonProcess: () => { starts += 1 },
    retryDelayMs: 0
  })

  const pending = bridge.start()
  FakeWebSocket.instances[0].fail()

  await assert.rejects(pending, /InterceptPilot daemon is not running/)
  assert.equal(starts, 0)
  assert.doesNotMatch(JSON.stringify(logs), /stable-key-123/)
})

test('daemon client returns a safe error when daemon cannot be started', async () => {
  const { bridge, logs } = makeBridge({
    startDaemonProcess: () => {
      throw new Error('spawn failed stable-key-123')
    },
    retryDelayMs: 0
  })

  const pending = bridge.start()
  FakeWebSocket.instances[0].fail()

  await assert.rejects(pending, /Unable to start InterceptPilot daemon/)
  assert.doesNotMatch(JSON.stringify(logs), /stable-key-123/)
})
