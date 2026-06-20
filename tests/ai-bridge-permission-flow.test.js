import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const backgroundSource = readFileSync(new URL('../src/background/background.js', import.meta.url), 'utf8')
const fullAppSource = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

test('AI Bridge start session copies saved default permissions into the session', () => {
  const startBlock = backgroundSource.match(/case 'aiBridge:startSession': \{[\s\S]*?return\n\s+\}/)?.[0] || ''

  assert.match(startBlock, /const state = await getState\(\)/)
  assert.match(startBlock, /startAiBridgeSession\(state\.settings\?\.aiBridgePermissions\)/)
})

test('AI Bridge background supports direct apply only through session permissions', () => {
  assert.match(backgroundSource, /allowImportBundleApplyThisSession/)
  assert.match(backgroundSource, /allowRuleActionsThisSession/)
  assert.match(backgroundSource, /approval: 'session_permission'/)
  assert.match(backgroundSource, /status: 'applied'/)
  assert.match(backgroundSource, /approval = 'modal_required'/)
})

test('Full App can update saved default permissions and current session permissions separately', () => {
  assert.match(fullAppSource, /aiBridgePermissions: normalizeAiBridgeDefaultPermissions/)
  assert.match(fullAppSource, /readAiBridgeDefaultPermissionsFormPayload/)
  assert.match(fullAppSource, /AI_BRIDGE_UPDATE_SESSION_PERMISSIONS/)
  assert.match(fullAppSource, /data-ai-bridge-session-permission/)
})

test('Full App applies permission presets and opens custom editing explicitly', () => {
  assert.match(fullAppSource, /data-ai-bridge-mode/)
  assert.match(fullAppSource, /createAiBridgeDefaultPermissionsForMode\(mode\)/)
  assert.match(fullAppSource, /createAiBridgeSessionPermissionsForMode\(mode\)/)
  assert.match(fullAppSource, /mode === AI_BRIDGE_PERMISSION_MODES\.custom/)
  assert.match(fullAppSource, /state\.aiBridgeDefaultPermissionsOpen = true/)
  assert.match(fullAppSource, /state\.aiBridgeSessionPermissionsOpen = true/)
})
