export const AI_BRIDGE_DEFAULT_PERMISSIONS = Object.freeze({
  allowQueryValuesByDefault: false,
  allowRequestHeadersByDefault: false,
  allowResponseHeadersByDefault: false,
  allowRequestBodyByDefault: false,
  allowResponseBodyByDefault: false,
  allowDetailedLogsByDefault: false,
  allowImportBundleApplyByDefault: false,
  allowRuleActionsByDefault: false,
  allowCapturedTabReloadByDefault: false
})

export const AI_BRIDGE_SESSION_PERMISSIONS = Object.freeze({
  allowQueryValuesThisSession: false,
  allowRequestHeadersThisSession: false,
  allowResponseHeadersThisSession: false,
  allowRequestBodyThisSession: false,
  allowResponseBodyThisSession: false,
  allowDetailedLogsThisSession: false,
  allowImportBundleApplyThisSession: false,
  allowRuleActionsThisSession: false,
  allowCapturedTabReloadThisSession: false
})

export const AI_BRIDGE_PERMISSION_PAIRS = Object.freeze([
  ['allowQueryValuesByDefault', 'allowQueryValuesThisSession'],
  ['allowRequestHeadersByDefault', 'allowRequestHeadersThisSession'],
  ['allowResponseHeadersByDefault', 'allowResponseHeadersThisSession'],
  ['allowRequestBodyByDefault', 'allowRequestBodyThisSession'],
  ['allowResponseBodyByDefault', 'allowResponseBodyThisSession'],
  ['allowDetailedLogsByDefault', 'allowDetailedLogsThisSession'],
  ['allowImportBundleApplyByDefault', 'allowImportBundleApplyThisSession'],
  ['allowRuleActionsByDefault', 'allowRuleActionsThisSession'],
  ['allowCapturedTabReloadByDefault', 'allowCapturedTabReloadThisSession']
])

export const AI_BRIDGE_PERMISSION_MODES = Object.freeze({
  safe: 'safe',
  assisted: 'assisted',
  advanced: 'advanced',
  custom: 'custom'
})

const AI_BRIDGE_DEFAULT_PERMISSION_PRESETS = Object.freeze({
  [AI_BRIDGE_PERMISSION_MODES.safe]: Object.freeze({
    ...AI_BRIDGE_DEFAULT_PERMISSIONS
  }),
  [AI_BRIDGE_PERMISSION_MODES.assisted]: Object.freeze({
    ...AI_BRIDGE_DEFAULT_PERMISSIONS,
    allowRuleActionsByDefault: true
  }),
  [AI_BRIDGE_PERMISSION_MODES.advanced]: Object.freeze({
    allowQueryValuesByDefault: true,
    allowRequestHeadersByDefault: true,
    allowResponseHeadersByDefault: true,
    allowRequestBodyByDefault: true,
    allowResponseBodyByDefault: true,
    allowDetailedLogsByDefault: true,
    allowImportBundleApplyByDefault: true,
    allowRuleActionsByDefault: true,
    allowCapturedTabReloadByDefault: true
  })
})

const DEFAULT_PERMISSION_KEYS = new Set(Object.keys(AI_BRIDGE_DEFAULT_PERMISSIONS))
const SESSION_PERMISSION_KEYS = new Set(Object.keys(AI_BRIDGE_SESSION_PERMISSIONS))
const ALL_PERMISSION_KEYS = new Set([
  ...DEFAULT_PERMISSION_KEYS,
  ...SESSION_PERMISSION_KEYS
])

function normalizeBooleanPermissions(input = {}, base = {}, allowedKeys = new Set()) {
  const next = { ...base }
  for (const key of allowedKeys) {
    if (typeof input?.[key] === 'boolean') {
      next[key] = input[key]
    }
  }
  return next
}

export function createDefaultAiBridgePermissions(seed = {}) {
  return normalizeAiBridgeDefaultPermissions(seed)
}

export function createSessionAiBridgePermissions(defaultPermissions = {}) {
  const normalizedDefaults = normalizeAiBridgeDefaultPermissions(defaultPermissions)
  const sessionPermissions = { ...AI_BRIDGE_SESSION_PERMISSIONS }
  for (const [defaultKey, sessionKey] of AI_BRIDGE_PERMISSION_PAIRS) {
    sessionPermissions[sessionKey] = Boolean(normalizedDefaults[defaultKey])
  }
  return sessionPermissions
}

function defaultPermissionsFromSessionPermissions(sessionPermissions = {}) {
  const normalizedSession = normalizeAiBridgeSessionPermissions(sessionPermissions)
  const defaults = { ...AI_BRIDGE_DEFAULT_PERMISSIONS }
  for (const [defaultKey, sessionKey] of AI_BRIDGE_PERMISSION_PAIRS) {
    defaults[defaultKey] = Boolean(normalizedSession[sessionKey])
  }
  return defaults
}

function defaultPermissionsEqual(a = {}, b = {}) {
  return JSON.stringify(normalizeAiBridgeDefaultPermissions(a)) === JSON.stringify(normalizeAiBridgeDefaultPermissions(b))
}

export function createAiBridgeDefaultPermissionsForMode(mode) {
  return normalizeAiBridgeDefaultPermissions(AI_BRIDGE_DEFAULT_PERMISSION_PRESETS[mode])
}

export function createAiBridgeSessionPermissionsForMode(mode) {
  return createSessionAiBridgePermissions(createAiBridgeDefaultPermissionsForMode(mode))
}

export function getAiBridgeDefaultPermissionMode(defaultPermissions = {}) {
  const normalized = normalizeAiBridgeDefaultPermissions(defaultPermissions)
  for (const mode of [
    AI_BRIDGE_PERMISSION_MODES.safe,
    AI_BRIDGE_PERMISSION_MODES.assisted,
    AI_BRIDGE_PERMISSION_MODES.advanced
  ]) {
    if (defaultPermissionsEqual(normalized, AI_BRIDGE_DEFAULT_PERMISSION_PRESETS[mode])) return mode
  }
  return AI_BRIDGE_PERMISSION_MODES.custom
}

export function getAiBridgeSessionPermissionMode(sessionPermissions = {}) {
  return getAiBridgeDefaultPermissionMode(defaultPermissionsFromSessionPermissions(sessionPermissions))
}

export function normalizeAiBridgeDefaultPermissions(input = {}) {
  return normalizeBooleanPermissions(input, AI_BRIDGE_DEFAULT_PERMISSIONS, DEFAULT_PERMISSION_KEYS)
}

export function normalizeAiBridgeSessionPermissions(input = {}) {
  return normalizeBooleanPermissions(input, AI_BRIDGE_SESSION_PERMISSIONS, SESSION_PERMISSION_KEYS)
}

export function normalizeAiBridgePermissionsPatch(input = {}) {
  const patch = {}
  for (const key of ALL_PERMISSION_KEYS) {
    if (typeof input?.[key] === 'boolean') {
      patch[key] = input[key]
    }
  }
  return patch
}
