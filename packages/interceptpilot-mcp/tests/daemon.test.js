import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'

import { createInterceptPilotDaemon } from '../src/daemon.js'

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

function parseSent(socket) {
  return socket.sent.map(message => JSON.parse(message))
}

function lastSent(socket) {
  return JSON.parse(socket.sent.at(-1))
}

function makeDaemon(options = {}) {
  const logs = []
  const daemon = createInterceptPilotDaemon({
    logger: {
      info: message => logs.push(['info', message]),
      warn: message => logs.push(['warn', message]),
      error: message => logs.push(['error', message])
    },
    ...options
  })
  return { daemon, logs }
}

function connectExtension(daemon, key = 'stable-key-123') {
  const socket = new FakeSocket()
  daemon.handleSocket(socket)
  socket.receive(JSON.stringify({
    type: 'hello',
    source: 'interceptpilot-extension',
    key,
    version: 1
  }))
  return socket
}

function connectClient(daemon, clientId = 'client-1', key = 'stable-key-123') {
  const socket = new FakeSocket()
  daemon.handleSocket(socket)
  socket.receive(JSON.stringify({
    type: 'client:hello',
    source: 'interceptpilot-mcp-client',
    key,
    version: 1,
    clientId
  }))
  return socket
}

test('daemon always binds WebSocket server to localhost only', () => {
  const listenOptions = []
  class FakeServer extends EventEmitter {
    constructor(options) {
      super()
      listenOptions.push(options)
    }
  }

  const { daemon } = makeDaemon({
    WebSocketServerCtor: FakeServer,
    host: '0.0.0.0',
    port: 37177
  })

  daemon.start()

  assert.deepEqual(listenOptions, [{ host: '127.0.0.1', port: 37177 }])
})

test('daemon accepts one extension and multiple MCP clients on the same port', () => {
  const { daemon } = makeDaemon()
  const extension = connectExtension(daemon)
  const clientA = connectClient(daemon, 'client-a')
  const clientB = connectClient(daemon, 'client-b')

  assert.equal(daemon.isExtensionConnected(), true)
  assert.equal(daemon.getClientCount(), 2)
  assert.deepEqual(lastSent(extension), { type: 'hello:ack', ok: true, version: 1 })
  assert.deepEqual(lastSent(clientA), { type: 'client:hello:ack', ok: true, version: 1 })
  assert.deepEqual(lastSent(clientB), { type: 'client:hello:ack', ok: true, version: 1 })
})

test('daemon routes each client command response back to the originating client', () => {
  let sequence = 0
  const { daemon } = makeDaemon({
    idGenerator: () => {
      sequence += 1
      return `ext-req-${sequence}`
    }
  })
  const extension = connectExtension(daemon)
  const clientA = connectClient(daemon, 'client-a')
  const clientB = connectClient(daemon, 'client-b')

  clientA.receive(JSON.stringify({
    id: 'client-a-1',
    type: 'client:command',
    command: 'list_rules',
    payload: {}
  }))
  clientB.receive(JSON.stringify({
    id: 'client-b-1',
    type: 'client:command',
    command: 'list_collections',
    payload: {}
  }))

  const extensionCommands = parseSent(extension).filter(message => message.type === 'command')
  assert.deepEqual(extensionCommands.map(message => message.id), ['ext-req-1', 'ext-req-2'])

  extension.receive(JSON.stringify({
    id: 'ext-req-2',
    type: 'command:result',
    ok: true,
    result: ['collection']
  }))
  extension.receive(JSON.stringify({
    id: 'ext-req-1',
    type: 'command:result',
    ok: true,
    result: ['rule']
  }))

  assert.deepEqual(lastSent(clientA), {
    id: 'client-a-1',
    type: 'client:result',
    ok: true,
    result: ['rule']
  })
  assert.deepEqual(lastSent(clientB), {
    id: 'client-b-1',
    type: 'client:result',
    ok: true,
    result: ['collection']
  })
  assert.equal(daemon.getPendingCount(), 0)
})

test('daemon rejects client commands before extension connects', () => {
  const { daemon } = makeDaemon()
  const client = connectClient(daemon, 'client-a')

  client.receive(JSON.stringify({
    id: 'client-a-1',
    type: 'client:command',
    command: 'list_rules',
    payload: {}
  }))

  assert.equal(lastSent(client).type, 'client:error')
  assert.equal(lastSent(client).id, 'client-a-1')
  assert.match(lastSent(client).error.message, /InterceptPilot extension is not connected/)
})

test('daemon rejects invalid client keys without logging key values', () => {
  const { daemon, logs } = makeDaemon({ expectedKey: 'new-key-456' })
  const client = connectClient(daemon, 'client-a', 'old-key-123')

  assert.equal(client.closed, true)
  assert.equal(daemon.getClientCount(), 0)
  assert.doesNotMatch(JSON.stringify(client.sent), /old-key-123|new-key-456/)
  assert.doesNotMatch(JSON.stringify(logs), /old-key-123|new-key-456/)
})

test('daemon rejects commands outside the allowed list', () => {
  const { daemon } = makeDaemon()
  connectExtension(daemon)
  const client = connectClient(daemon, 'client-a')

  client.receive(JSON.stringify({
    id: 'client-a-1',
    type: 'client:command',
    command: 'delete_everything',
    payload: {}
  }))

  assert.deepEqual(lastSent(client), {
    id: 'client-a-1',
    type: 'client:error',
    ok: false,
    error: {
      code: 'COMMAND_NOT_ALLOWED',
      message: 'Command is not allowed.'
    }
  })
})

test('daemon keeps other clients working when one client disconnects with pending requests', () => {
  let sequence = 0
  const { daemon } = makeDaemon({
    idGenerator: () => {
      sequence += 1
      return `ext-req-${sequence}`
    }
  })
  const extension = connectExtension(daemon)
  const clientA = connectClient(daemon, 'client-a')
  const clientB = connectClient(daemon, 'client-b')

  clientA.receive(JSON.stringify({ id: 'client-a-1', type: 'client:command', command: 'list_rules', payload: {} }))
  clientB.receive(JSON.stringify({ id: 'client-b-1', type: 'client:command', command: 'list_collections', payload: {} }))
  assert.equal(daemon.getPendingCount(), 2)

  clientA.close()
  assert.equal(daemon.getPendingCount(), 1)
  assert.equal(daemon.getClientCount(), 1)

  extension.receive(JSON.stringify({
    id: 'ext-req-2',
    type: 'command:result',
    ok: true,
    result: ['collection']
  }))

  assert.deepEqual(lastSent(clientB), {
    id: 'client-b-1',
    type: 'client:result',
    ok: true,
    result: ['collection']
  })
  assert.equal(daemon.getPendingCount(), 0)
})

test('daemon rejects all pending client requests when extension disconnects', () => {
  let sequence = 0
  const { daemon } = makeDaemon({
    idGenerator: () => {
      sequence += 1
      return `ext-req-${sequence}`
    }
  })
  const extension = connectExtension(daemon)
  const clientA = connectClient(daemon, 'client-a')
  const clientB = connectClient(daemon, 'client-b')

  clientA.receive(JSON.stringify({ id: 'client-a-1', type: 'client:command', command: 'list_rules', payload: {} }))
  clientB.receive(JSON.stringify({ id: 'client-b-1', type: 'client:command', command: 'list_collections', payload: {} }))
  extension.close()

  assert.equal(daemon.isExtensionConnected(), false)
  assert.equal(daemon.getClientCount(), 2)
  assert.equal(daemon.getPendingCount(), 0)
  assert.match(lastSent(clientA).error.message, /InterceptPilot extension disconnected/)
  assert.match(lastSent(clientB).error.message, /InterceptPilot extension disconnected/)
})

test('daemon keeps clients connected while extension is disconnected and resumes after reconnect', () => {
  let sequence = 0
  const { daemon } = makeDaemon({
    idGenerator: () => {
      sequence += 1
      return `ext-req-${sequence}`
    }
  })
  const extension = connectExtension(daemon)
  const client = connectClient(daemon, 'client-a')

  extension.close()
  assert.equal(daemon.getClientCount(), 1)

  client.receive(JSON.stringify({ id: 'client-a-1', type: 'client:command', command: 'list_rules', payload: {} }))
  assert.match(lastSent(client).error.message, /InterceptPilot extension is not connected/)

  const reconnectedExtension = connectExtension(daemon)
  client.receive(JSON.stringify({ id: 'client-a-2', type: 'client:command', command: 'list_rules', payload: {} }))
  assert.deepEqual(lastSent(reconnectedExtension), {
    id: 'ext-req-1',
    type: 'command',
    command: 'list_rules',
    payload: {}
  })

  reconnectedExtension.receive(JSON.stringify({
    id: 'ext-req-1',
    type: 'command:result',
    ok: true,
    result: ['ok']
  }))
  assert.deepEqual(lastSent(client), {
    id: 'client-a-2',
    type: 'client:result',
    ok: true,
    result: ['ok']
  })
})

test('daemon heartbeat runs only between daemon and extension', () => {
  let tick = null
  const { daemon } = makeDaemon({
    heartbeatIntervalMs: 1000,
    setIntervalFn: fn => { tick = fn; return 'timer-1' },
    clearIntervalFn: () => { tick = null }
  })
  const extension = connectExtension(daemon)
  const client = connectClient(daemon, 'client-a')
  extension.sent.length = 0
  client.sent.length = 0

  tick()

  assert.deepEqual(lastSent(extension), { type: 'ping' })
  assert.deepEqual(client.sent, [])
})
