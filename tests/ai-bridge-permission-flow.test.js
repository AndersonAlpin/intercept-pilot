import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const backgroundSource = readFileSync(new URL('../src/background/background.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const fullAppSource = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')
const fullAppCss = readFileSync(new URL('../src/fullapp/fullapp.css', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

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

test('Full App persists AI Bridge permission changes and syncs the active session', () => {
  assert.match(fullAppSource, /aiBridgePermissions: normalizeAiBridgeDefaultPermissions/)
  assert.match(fullAppSource, /readAiBridgeDefaultPermissionsFormPayload/)
  assert.match(fullAppSource, /AI_BRIDGE_UPDATE_SESSION_PERMISSIONS/)
  assert.match(fullAppSource, /data-ai-bridge-session-permission/)
  assert.match(fullAppSource, /async function saveAiBridgeDefaultPermissions/)
  assert.match(fullAppSource, /async function updateAiBridgeSessionPermissions/)
  assert.match(fullAppSource, /createSessionAiBridgePermissions\(savedPermissions\)/)
})

test('Full App applies permission presets and opens custom permissions from the mode card', () => {
  assert.match(fullAppSource, /data-ai-bridge-mode/)
  assert.match(fullAppSource, /createAiBridgeDefaultPermissionsForMode\(mode\)/)
  assert.match(fullAppSource, /createAiBridgeSessionPermissionsForMode\(mode\)/)
  assert.match(fullAppSource, /await applyAiBridgePermissionMode\(mode\)/)
  assert.doesNotMatch(fullAppSource, /await applyAiBridgeSessionPermissionMode\(mode\)/)
  assert.match(fullAppSource, /mode === AI_BRIDGE_PERMISSION_MODES\.custom/)
  assert.match(fullAppSource, /state\.aiBridgeDefaultPermissionsOpen = true/)
  assert.match(fullAppSource, /state\.aiBridgeSessionPermissionsOpen = true/)
  assert.doesNotMatch(fullAppSource, /ai-bridge-edit-custom-permissions-btn/)
})

test('Full App toggles MCP configuration visibility without changing the copied payload', () => {
  assert.match(fullAppSource, /aiBridgeConfigVisible: false/)
  assert.match(fullAppSource, /configVisible: state\.aiBridgeConfigVisible/)
  assert.match(fullAppSource, /settings-ai-bridge-toggle-config-btn/)
  assert.match(fullAppSource, /state\.aiBridgeConfigVisible = !state\.aiBridgeConfigVisible/)
  assert.match(fullAppSource, /copyTextToClipboard\(configText\)/)
})

test('Full App keeps the stable MCP configuration available after the session ends', () => {
  const revokeBlock = fullAppSource.match(/\$\(('#settings-ai-bridge-revoke-btn'|"#settings-ai-bridge-revoke-btn")\)\?\.addEventListener\('click'[\s\S]*?\n  \}\)/)?.[0] || ''
  const aiBridgeStateBlock = fullAppSource.match(/if \(message\?\.type === 'state:aiBridge'\) \{[\s\S]*?\n  \}/)?.[0] || ''

  // The stable connection key persists across Stop, so the copied config stays valid and is not force-hidden.
  assert.match(revokeBlock, /await refreshState\(\)/)
  assert.doesNotMatch(revokeBlock, /state\.aiBridgeConfigVisible = false/)
  assert.doesNotMatch(aiBridgeStateBlock, /state\.aiBridgeConfigVisible = false/)
})

test('Full App preserves scroll position when re-rendering the same page', () => {
  assert.match(fullAppSource, /let lastRenderedPage = null/)
  assert.match(fullAppSource, /function captureScrollSnapshot\(\)/)
  assert.match(fullAppSource, /dataPanelTop: dataPanelScroll\?\.scrollTop/)
  assert.match(fullAppSource, /function restoreScrollSnapshot\(snapshot\)/)
  assert.match(fullAppSource, /snapshot\.page !== state\.page/)
  assert.match(fullAppSource, /restoreScrollSnapshot\(scrollSnapshot\)/)
  assert.match(fullAppSource, /lastRenderedPage = state\.page/)
})

test('AI Bridge permission cards are clickable and expose hover focus states', () => {
  assert.match(fullAppCss, /\.ai-bridge-permission-item \{[\s\S]*cursor: pointer;/)
  assert.match(fullAppCss, /\.ai-bridge-permission-item:hover \{/)
  assert.match(fullAppCss, /\.ai-bridge-permission-item:focus-within \{/)
})

test('AI Bridge manual permission toggles do not emit repeated success toasts', () => {
  const defaultToggleBlock = fullAppSource.match(/document\.querySelectorAll\('\[data-ai-bridge-default-permission\]'\)[\s\S]*?document\.querySelectorAll\('\[data-ai-bridge-session-permission\]'\)/)?.[0] || ''

  assert.match(defaultToggleBlock, /state\.aiBridgeDefaultPermissionsOpen = true/)
  assert.doesNotMatch(defaultToggleBlock, /toastSuccess/)
})
