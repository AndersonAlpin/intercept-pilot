import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { renderAiBridgeSettingsSection } from '../src/fullapp/components/ai-bridge-settings-section.js'

test('AI Bridge settings section renders only a short navigation shortcut', () => {
  setLocale('en')
  const html = renderAiBridgeSettingsSection()

  assert.match(html, />AI Bridge</)
  assert.match(html, /Configure the local AI agent connection/)
  assert.match(html, /id="settings-ai-bridge-open-btn"/)
  assert.match(html, /Open AI Bridge/)
  assert.doesNotMatch(html, /Start session/)
  assert.doesNotMatch(html, /Copy MCP configuration/)
  assert.doesNotMatch(html, /--token/)
})

test('AI Bridge settings section uses localized status labels', () => {
  setLocale('pt-BR')
  const pt = renderAiBridgeSettingsSection()
  assert.match(pt, /Abrir AI Bridge/)

  setLocale('es')
  const es = renderAiBridgeSettingsSection()
  assert.match(es, /Abrir AI Bridge/)
})
