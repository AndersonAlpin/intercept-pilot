import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { setLocale } from '../src/shared/i18n.js'
import { renderSidebar } from '../src/fullapp/components/sidebar.js'
import { renderAiBridgeSettingsSection } from '../src/fullapp/components/ai-bridge-settings-section.js'

const fullAppSource = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

test('Full App sidebar renders AI Bridge before Settings', () => {
  setLocale('pt-BR')
  const html = renderSidebar('ai-bridge')

  assert.match(html, /data-page="ai-bridge"/)
  assert.match(html, />AI Bridge</)
  assert.ok(html.indexOf('data-page="ai-bridge"') < html.indexOf('data-page="settings"'))
})

test('Full App routes page=ai-bridge to the dedicated AI Bridge page', () => {
  assert.match(fullAppSource, /'ai-bridge'/)
  assert.match(fullAppSource, /renderAiBridgePage\(state/)
  assert.match(fullAppSource, /if \(state\.page === 'ai-bridge'\)/)
})

test('Settings keeps only the short AI Bridge shortcut', () => {
  setLocale('en')
  const html = renderAiBridgeSettingsSection()

  assert.match(html, /id="settings-ai-bridge-open-btn"/)
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
  assert.doesNotMatch(html, /settings-ai-bridge-config/)
})
