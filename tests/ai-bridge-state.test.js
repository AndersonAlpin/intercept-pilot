import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_BRIDGE_STATUS,
  DEFAULT_AI_BRIDGE_PORT,
  LOCAL_MCP_ENTRY_PLACEHOLDER,
  buildAiBridgeMcpConfig,
  buildAiBridgeMcpConfigText,
  createAiBridgeSessionState,
  generateAiBridgeConnectionKey,
  normalizeAiBridgeSessionState,
  redactAiBridgeKey,
  resolveAiBridgeConnectionKey
} from '../src/shared/ai-bridge-state.js'

test('AI Bridge session state starts disabled and carries no credential', () => {
  const state = createAiBridgeSessionState()

  assert.deepEqual(state, {
    status: AI_BRIDGE_STATUS.disabled,
    port: DEFAULT_AI_BRIDGE_PORT,
    startedAt: null,
    connectedAt: null,
    permissions: null
  })
  assert.equal('token' in state, false)
})

test('generateAiBridgeConnectionKey returns 64 hex chars and is unique', () => {
  const a = generateAiBridgeConnectionKey()
  const b = generateAiBridgeConnectionKey()
  assert.match(a, /^[0-9a-f]{64}$/)
  assert.notEqual(a, b)
})

test('resolveAiBridgeConnectionKey keeps an existing key and generates only when missing', () => {
  assert.equal(resolveAiBridgeConnectionKey('existing-key'), 'existing-key')
  assert.match(resolveAiBridgeConnectionKey(''), /^[0-9a-f]{64}$/)
})

test('redactAiBridgeKey masks the key everywhere and is a no-op for empty key', () => {
  const key = 'a'.repeat(64)
  assert.equal(redactAiBridgeKey(`x ${key} y ${key}`, key).includes(key), false)
  assert.match(redactAiBridgeKey(`x ${key} y`, key), /x \[redacted\] y/)
  assert.equal(redactAiBridgeKey('hello', ''), 'hello')
})

test('AI Bridge config is empty without a connection key', () => {
  assert.equal(buildAiBridgeMcpConfig({ key: '', port: 37177 }), null)
  assert.equal(buildAiBridgeMcpConfigText({ key: '', port: 37177 }), '')
  assert.equal(buildAiBridgeMcpConfigText(createAiBridgeSessionState()), '')
})

test('AI Bridge npx config uses --key with the stable key and port', () => {
  assert.deepEqual(buildAiBridgeMcpConfig({ key: 'stable-key-123', port: 37177 }), {
    mcpServers: {
      interceptpilot: {
        command: 'npx',
        args: ['-y', 'interceptpilot-mcp', '--port', '37177', '--key', 'stable-key-123']
      }
    }
  })
  assert.match(buildAiBridgeMcpConfigText({ key: 'stable-key-123', port: 37177 }), /"--key"/)
  assert.match(buildAiBridgeMcpConfigText({ key: 'stable-key-123', port: 37177 }), /"stable-key-123"/)
})

test('AI Bridge local/dev config uses node with the placeholder entry path and --key', () => {
  const cfg = buildAiBridgeMcpConfig({ key: 'stable-key-123', port: 37177, mode: 'local' })
  assert.equal(cfg.mcpServers.interceptpilot.command, 'node')
  assert.equal(cfg.mcpServers.interceptpilot.args[0], LOCAL_MCP_ENTRY_PLACEHOLDER)
  assert.deepEqual(cfg.mcpServers.interceptpilot.args.slice(1), ['--port', '37177', '--key', 'stable-key-123'])
})

test('AI Bridge normalizes invalid state back to disabled', () => {
  assert.deepEqual(normalizeAiBridgeSessionState({ status: 'unexpected', port: 37177 }), createAiBridgeSessionState())
})

test('AI Bridge normalizes an active session without requiring a credential', () => {
  const normalized = normalizeAiBridgeSessionState({
    status: AI_BRIDGE_STATUS.waiting,
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z'
  })
  assert.equal(normalized.status, AI_BRIDGE_STATUS.waiting)
  assert.equal('token' in normalized, false)
  assert.notEqual(normalized.permissions, null)
})
