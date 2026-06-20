import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fullAppSource = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

test('general settings page does not include the AI Bridge shortcut section', () => {
  assert.doesNotMatch(fullAppSource, /renderAiBridgeSettingsSection/)
  assert.doesNotMatch(fullAppSource, /settings-ai-bridge-open-btn/)
  assert.doesNotMatch(fullAppSource, /aiBridgeSettingsShortcutDescription/)
  assert.doesNotMatch(fullAppSource, /aiBridgeOpenPage/)
})
