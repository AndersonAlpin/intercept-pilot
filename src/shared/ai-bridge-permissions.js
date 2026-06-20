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
