import test from 'node:test'
import assert from 'node:assert/strict'

import {
  AI_BRIDGE_DEFAULT_PERMISSIONS,
  AI_BRIDGE_SESSION_PERMISSIONS,
  createDefaultAiBridgePermissions,
  createSessionAiBridgePermissions,
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
