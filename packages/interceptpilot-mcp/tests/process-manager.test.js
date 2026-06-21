import test from 'node:test'
import assert from 'node:assert/strict'

import { startDaemonProcess } from '../src/process-manager.js'

const silentLogger = {
  info: () => {},
  warn: () => {},
  error: () => {}
}

test('startDaemonProcess spawns detached daemon without logging the key', () => {
  const calls = []
  const logs = []

  startDaemonProcess({
    port: 37177,
    key: 'stable-key-123',
    nodeExecPath: 'node',
    entryPath: 'src/index.js',
    spawnFn: (...args) => {
      calls.push(args)
      return { unref: () => {} }
    },
    logger: {
      info: message => logs.push(['info', message]),
      warn: message => logs.push(['warn', message]),
      error: message => logs.push(['error', message])
    }
  })

  assert.equal(calls.length, 1)
  assert.deepEqual(calls[0][2], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  assert.doesNotMatch(JSON.stringify(logs), /stable-key-123/)
})

test('startDaemonProcess passes daemon subcommand before port and key args', () => {
  const calls = []

  startDaemonProcess({
    port: 37177,
    key: 'stable-key-123',
    nodeExecPath: 'node',
    entryPath: 'src/index.js',
    logger: silentLogger,
    spawnFn: (...args) => {
      calls.push(args)
      return { unref: () => {} }
    }
  })

  assert.equal(calls[0][0], 'node')
  assert.deepEqual(calls[0][1], ['src/index.js', 'daemon', '--port', '37177', '--key', 'stable-key-123'])
})

test('startDaemonProcess unrefs child when supported', () => {
  let unrefCount = 0

  startDaemonProcess({
    port: 37177,
    key: 'stable-key-123',
    nodeExecPath: 'node',
    entryPath: 'src/index.js',
    logger: silentLogger,
    spawnFn: () => ({
      unref: () => { unrefCount += 1 }
    })
  })

  assert.equal(unrefCount, 1)
})
