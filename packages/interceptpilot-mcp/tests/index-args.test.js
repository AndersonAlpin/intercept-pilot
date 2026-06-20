import test from 'node:test'
import assert from 'node:assert/strict'

import { parseCliArgs } from '../src/index.js'
import { BRIDGE_PORT } from '../src/protocol.js'

test('parseCliArgs reads the preferred --key flag', () => {
  const options = parseCliArgs(['--port', '40000', '--key', 'stable-key-123'])
  assert.equal(options.port, 40000)
  assert.equal(options.key, 'stable-key-123')
})

test('parseCliArgs ignores an unknown flag and keeps the empty key default', () => {
  const options = parseCliArgs(['--token', 'legacy-token-456'])
  assert.equal(options.key, '')
  assert.equal(options.port, BRIDGE_PORT)
})

test('parseCliArgs defaults to the bridge port and an empty key', () => {
  const options = parseCliArgs([])
  assert.equal(options.port, BRIDGE_PORT)
  assert.equal(options.key, '')
})
