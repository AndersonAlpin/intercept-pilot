import test from 'node:test'
import assert from 'node:assert/strict'

import { createRuntime, parseCliArgs } from '../src/index.js'
import { BRIDGE_PORT } from '../src/protocol.js'

test('parseCliArgs reads the preferred --key flag', () => {
  const options = parseCliArgs(['--port', '40000', '--key', 'stable-key-123'])
  assert.equal(options.mode, 'adapter')
  assert.equal(options.port, 40000)
  assert.equal(options.key, 'stable-key-123')
  assert.equal(options.daemonHost, '127.0.0.1')
  assert.equal(options.daemonAutostart, true)
})

test('parseCliArgs ignores an unknown flag and keeps the empty key default', () => {
  const options = parseCliArgs(['--token', 'legacy-token-456'])
  assert.equal(options.mode, 'adapter')
  assert.equal(options.key, '')
  assert.equal(options.port, BRIDGE_PORT)
  assert.equal(options.daemonHost, '127.0.0.1')
  assert.equal(options.daemonAutostart, true)
})

test('parseCliArgs defaults to the bridge port and an empty key', () => {
  const options = parseCliArgs([])
  assert.equal(options.mode, 'adapter')
  assert.equal(options.port, BRIDGE_PORT)
  assert.equal(options.key, '')
  assert.equal(options.daemonHost, '127.0.0.1')
  assert.equal(options.daemonAutostart, true)
})

test('parseCliArgs supports explicit daemon mode', () => {
  const options = parseCliArgs(['daemon', '--port', '37178', '--key', 'stable-key-123'])
  assert.equal(options.mode, 'daemon')
  assert.equal(options.port, 37178)
  assert.equal(options.key, 'stable-key-123')
  assert.equal(options.daemonHost, '127.0.0.1')
  assert.equal(options.daemonAutostart, true)
})

test('parseCliArgs supports disabling daemon autostart for adapter debugging', () => {
  const options = parseCliArgs(['--no-daemon-autostart', '--port', '37179', '--key', 'stable-key-123'])
  assert.equal(options.mode, 'adapter')
  assert.equal(options.port, 37179)
  assert.equal(options.key, 'stable-key-123')
  assert.equal(options.daemonHost, '127.0.0.1')
  assert.equal(options.daemonAutostart, false)
})

test('createRuntime starts daemon only in daemon mode', async () => {
  const calls = []

  await createRuntime({
    mode: 'daemon',
    port: 37177,
    key: 'stable-key-123',
    daemonAutostart: true
  }, {
    createInterceptPilotDaemon: options => ({
      start: () => calls.push(['daemon:start', options.port, options.expectedKey]),
      close: async () => calls.push(['daemon:close'])
    }),
    createDaemonClientBridge: () => {
      calls.push(['adapter:create'])
      return {}
    },
    createMcpServer: () => {
      calls.push(['mcp:create'])
      return { connect: async () => {} }
    },
    StdioServerTransportCtor: class FakeTransport {}
  })

  assert.deepEqual(calls, [['daemon:start', 37177, 'stable-key-123']])
})

test('createRuntime starts MCP stdio adapter in default mode', async () => {
  const calls = []
  const fakeBridge = {
    start: async () => calls.push(['adapter:start']),
    close: async () => calls.push(['adapter:close'])
  }
  const fakeTransport = { kind: 'stdio' }

  await createRuntime({
    mode: 'adapter',
    port: 37177,
    key: 'stable-key-123',
    daemonAutostart: false
  }, {
    createDaemonClientBridge: options => {
      calls.push(['adapter:create', options.port, options.expectedKey, options.daemonAutostart])
      return fakeBridge
    },
    createMcpServer: ({ bridge }) => {
      calls.push(['mcp:create', bridge === fakeBridge])
      return {
        connect: async transport => calls.push(['mcp:connect', transport === fakeTransport]),
        close: async () => calls.push(['mcp:close'])
      }
    },
    createInterceptPilotDaemon: () => {
      calls.push(['daemon:create'])
      return {}
    },
    StdioServerTransportCtor: class FakeTransport {
      constructor() {
        return fakeTransport
      }
    }
  })

  assert.deepEqual(calls, [
    ['adapter:create', 37177, 'stable-key-123', false],
    ['adapter:start'],
    ['mcp:create', true],
    ['mcp:connect', true]
  ])
})
