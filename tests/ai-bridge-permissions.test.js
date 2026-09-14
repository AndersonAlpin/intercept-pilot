import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_BRIDGE_DEFAULT_PERMISSIONS,
  AI_BRIDGE_PERMISSION_MODES,
  AI_BRIDGE_SESSION_PERMISSIONS,
  createAiBridgeDefaultPermissionsForMode,
  createAiBridgeSessionPermissionsForMode,
  createDefaultAiBridgePermissions,
  createSessionAiBridgePermissions,
  getAiBridgeDefaultPermissionMode,
  getAiBridgeSessionPermissionMode,
  normalizeAiBridgeDefaultPermissions,
  normalizeAiBridgeSessionPermissions,
  normalizeAiBridgePermissionsPatch
} from '../src/shared/ai-bridge-permissions.js'

test('AI Bridge default permissions start with every advanced permission disabled', () => {
  assert.deepEqual(createDefaultAiBridgePermissions(), AI_BRIDGE_DEFAULT_PERMISSIONS)
  assert.equal(Object.values(AI_BRIDGE_DEFAULT_PERMISSIONS).every(value => value === false), true)
})

test('AI Bridge session permissions are copied from saved defaults', () => {
  const defaults = normalizeAiBridgeDefaultPermissions({
    allowQueryValuesByDefault: true,
    allowRequestHeadersByDefault: true,
    allowImportBundleApplyByDefault: true,
    token: 'must-not-survive'
  })

  assert.deepEqual(defaults, {
    ...AI_BRIDGE_DEFAULT_PERMISSIONS,
    allowQueryValuesByDefault: true,
    allowRequestHeadersByDefault: true,
    allowImportBundleApplyByDefault: true
  })

  assert.deepEqual(createSessionAiBridgePermissions(defaults), {
    ...AI_BRIDGE_SESSION_PERMISSIONS,
    allowQueryValuesThisSession: true,
    allowRequestHeadersThisSession: true,
    allowImportBundleApplyThisSession: true
  })
})

test('AI Bridge safe preset disables every advanced permission', () => {
  const defaults = createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.safe)
  const session = createAiBridgeSessionPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.safe)

  assert.equal(Object.values(defaults).every(value => value === false), true)
  assert.equal(Object.values(session).every(value => value === false), true)
  assert.equal(getAiBridgeDefaultPermissionMode(defaults), AI_BRIDGE_PERMISSION_MODES.safe)
  assert.equal(getAiBridgeSessionPermissionMode(session), AI_BRIDGE_PERMISSION_MODES.safe)
})

test('AI Bridge assisted preset keeps data hidden and only releases assisted actions', () => {
  const defaults = createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.assisted)

  assert.equal(defaults.allowRuleActionsByDefault, true)
  assert.equal(defaults.allowQueryValuesByDefault, false)
  assert.equal(defaults.allowRequestHeadersByDefault, false)
  assert.equal(defaults.allowResponseHeadersByDefault, false)
  assert.equal(defaults.allowRequestBodyByDefault, false)
  assert.equal(defaults.allowResponseBodyByDefault, false)
  assert.equal(defaults.allowDetailedLogsByDefault, false)
  assert.equal(defaults.allowImportBundleApplyByDefault, false)
  assert.equal(defaults.allowCapturedTabReloadByDefault, false)
  assert.equal(getAiBridgeDefaultPermissionMode(defaults), AI_BRIDGE_PERMISSION_MODES.assisted)
})

test('AI Bridge advanced preset enables every advanced permission', () => {
  const defaults = createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.advanced)
  const session = createAiBridgeSessionPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.advanced)

  assert.equal(Object.values(defaults).every(value => value === true), true)
  assert.equal(Object.values(session).every(value => value === true), true)
  assert.equal(getAiBridgeDefaultPermissionMode(defaults), AI_BRIDGE_PERMISSION_MODES.advanced)
  assert.equal(getAiBridgeSessionPermissionMode(session), AI_BRIDGE_PERMISSION_MODES.advanced)
})

test('AI Bridge partial combinations are treated as custom mode', () => {
  assert.equal(getAiBridgeDefaultPermissionMode({
    allowQueryValuesByDefault: true
  }), AI_BRIDGE_PERMISSION_MODES.custom)
  assert.equal(getAiBridgeSessionPermissionMode({
    allowRuleActionsThisSession: true,
    allowQueryValuesThisSession: true
  }), AI_BRIDGE_PERMISSION_MODES.custom)
})

test('AI Bridge permission patches keep only known boolean preferences', () => {
  assert.deepEqual(normalizeAiBridgePermissionsPatch({
    allowResponseBodyThisSession: true,
    allowRuleActionsByDefault: 1,
    allowQueryValuesThisSession: 'yes',
    Authorization: 'Bearer secret'
  }), {
    allowResponseBodyThisSession: true
  })
})

test('AI Bridge session permission normalization drops sensitive or unknown fields', () => {
  const permissions = normalizeAiBridgeSessionPermissions({
    allowDetailedLogsThisSession: true,
    allowCapturedTabReloadThisSession: true,
    cookie: 'sid=secret'
  })

  assert.deepEqual(permissions, {
    ...AI_BRIDGE_SESSION_PERMISSIONS,
    allowDetailedLogsThisSession: true,
    allowCapturedTabReloadThisSession: true
  })
  assert.doesNotMatch(JSON.stringify(permissions), /secret|cookie/i)
})
