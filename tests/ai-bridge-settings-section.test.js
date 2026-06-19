import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { AI_BRIDGE_STATUS, createAiBridgeSessionState } from '../src/shared/ai-bridge-state.js'
import { renderAiBridgeSettingsSection } from '../src/fullapp/components/ai-bridge-settings-section.js'

test('AI Bridge settings section renders disabled state without token or copy action', () => {
  setLocale('en')
  const html = renderAiBridgeSettingsSection(createAiBridgeSessionState())

  assert.match(html, />AI Bridge</)
  assert.match(html, /Connect InterceptPilot to local AI agents/)
  assert.match(html, /Disabled/)
  assert.match(html, /Start session/)
  assert.match(html, /AI agents cannot access extension data while AI Bridge is disabled/)
  assert.doesNotMatch(html, /Copy MCP configuration/)
  assert.doesNotMatch(html, /--token/)
})

test('AI Bridge settings section renders waiting session with config and revoke action', () => {
  setLocale('en')
  const html = renderAiBridgeSettingsSection({
    status: AI_BRIDGE_STATUS.waiting,
    token: 'pairing-token-123',
    port: 37177,
    startedAt: '2026-06-19T12:00:00.000Z',
    connectedAt: null
  })

  assert.match(html, /Waiting for local bridge/)
  assert.match(html, /Revoke session/)
  assert.match(html, /Copy MCP configuration/)
  assert.match(html, /interceptpilot-mcp/)
  assert.match(html, /pairing-token-123/)
  assert.match(html, /No data is sent automatically/)
})

test('AI Bridge settings section uses localized status labels', () => {
  setLocale('pt-BR')
  const pt = renderAiBridgeSettingsSection(createAiBridgeSessionState())
  assert.match(pt, /Desligado/)
  assert.match(pt, /Iniciar sessão/)

  setLocale('es')
  const es = renderAiBridgeSettingsSection(createAiBridgeSessionState())
  assert.match(es, /Desactivado/)
  assert.match(es, /Iniciar sesión/)
})
