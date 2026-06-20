import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ALLOWED_COMMANDS,
  BRIDGE_PROTOCOL_VERSION,
  createCommandMessage,
  isAllowedCommand,
  parseBridgeMessage,
  validateHelloMessage
} from '../src/protocol.js'

test('protocol exposes only allowed MVP commands', () => {
  assert.deepEqual(ALLOWED_COMMANDS, [
    'list_captured_requests',
    'list_collections',
    'list_rules',
    'list_sanitized_logs',
    'list_recent_rule_results',
    'get_active_collection',
    'get_current_test_context',
    'get_import_bundle_schema',
    'get_import_bundle_examples',
    'import_bundle'
  ])
  assert.equal(isAllowedCommand('list_rules'), true)
  assert.equal(isAllowedCommand('list_sanitized_logs'), true)
  assert.equal(isAllowedCommand('list_recent_rule_results'), true)
  assert.equal(isAllowedCommand('get_current_test_context'), true)
  assert.equal(isAllowedCommand('get_import_bundle_schema'), true)
  assert.equal(isAllowedCommand('get_import_bundle_examples'), true)
  assert.equal(isAllowedCommand('import_bundle'), true)
  assert.equal(isAllowedCommand('enable_rule'), false)
  assert.equal(isAllowedCommand('set_capture_mode'), false)
})

test('protocol creates local command messages with stable shape', () => {
  assert.deepEqual(createCommandMessage('req_1', 'list_rules', {}), {
    id: 'req_1',
    type: 'command',
    command: 'list_rules',
    payload: {}
  })
})

test('protocol validates extension hello without exposing token', () => {
  const result = validateHelloMessage({
    type: 'hello',
    source: 'interceptpilot-extension',
    token: 'pairing-token-123',
    version: BRIDGE_PROTOCOL_VERSION
  })

  assert.equal(result.ok, true)
  assert.deepEqual(validateHelloMessage({ type: 'hello', token: '' }), {
    ok: false,
    error: 'Invalid InterceptPilot hello message.'
  })
  assert.doesNotMatch(JSON.stringify(result), /pairing-token-123/)
})

test('protocol rejects hello when expected token does not match', () => {
  const result = validateHelloMessage({
    type: 'hello',
    source: 'interceptpilot-extension',
    token: 'pairing-token-123',
    version: BRIDGE_PROTOCOL_VERSION
  }, { expectedToken: 'different-token' })

  assert.deepEqual(result, {
    ok: false,
    error: 'Invalid InterceptPilot hello message.'
  })
  assert.doesNotMatch(JSON.stringify(result), /pairing-token-123|different-token/)
})

test('protocol parses valid JSON messages and ignores invalid JSON', () => {
  assert.deepEqual(parseBridgeMessage('{"type":"hello"}'), { type: 'hello' })
  assert.equal(parseBridgeMessage('{bad json'), null)
})
