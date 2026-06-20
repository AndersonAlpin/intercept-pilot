import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_BRIDGE_STATUS,
  DEFAULT_AI_BRIDGE_PORT,
  buildAiBridgeMcpConfig,
  buildAiBridgeMcpConfigText,
  createAiBridgeSessionState,
  normalizeAiBridgeSessionState
} from '../src/shared/ai-bridge-state.js'

test('AI Bridge state starts disabled without token or config', () => {
  const state = createAiBridgeSessionState()

  assert.deepEqual(state, {
    status: AI_BRIDGE_STATUS.disabled,
    token: '',
    port: DEFAULT_AI_BRIDGE_PORT,
    startedAt: null,
    connectedAt: null,
    permissions: null
  })
  assert.equal(buildAiBridgeMcpConfigText(state), '')
})

test('AI Bridge config includes the session token and local bridge port', () => {
  const state = normalizeAiBridgeSessionState({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z'
  })

  assert.deepEqual(buildAiBridgeMcpConfig(state), {
    mcpServers: {
      interceptpilot: {
        command: 'npx',
        args: ['-y', 'interceptpilot-mcp', '--port', '37177', '--token', 'pairing-token-123']
      }
    }
  })
  assert.match(buildAiBridgeMcpConfigText(state), /"interceptpilot-mcp"/)
  assert.match(buildAiBridgeMcpConfigText(state), /"pairing-token-123"/)
})

test('AI Bridge normalizes invalid or tokenless state back to disabled', () => {
  assert.deepEqual(normalizeAiBridgeSessionState({
    status: AI_BRIDGE_STATUS.waiting,
    token: '',
    port: 0,
    startedAt: '2026-06-19T12:00:00.000Z'
  }), createAiBridgeSessionState())

  assert.deepEqual(normalizeAiBridgeSessionState({
    status: 'unexpected',
    token: 'token',
    port: 37177
  }), createAiBridgeSessionState())
})
