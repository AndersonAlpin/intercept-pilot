import { getVisibleLogsForCapture, getVisibleNetworkEntriesForCapture, hasActiveCaptureContext } from '../shared/capture-context.js'
import {
  sanitizeAiBridgeQueryKeys,
  sanitizeAiBridgeCollection,
  sanitizeAiBridgeLog,
  sanitizeAiBridgeRequest,
  sanitizeAiBridgeRule,
  sanitizeAiBridgeRuleResult
} from '../shared/ai-bridge-sanitize.js'
import { explainRuleMatch } from './ai-bridge-diagnostics.js'

export const MAX_AI_BRIDGE_CAPTURED_REQUESTS = 100
export const MAX_AI_BRIDGE_SANITIZED_LOGS = 100
export const MAX_AI_BRIDGE_RECENT_RULE_RESULTS = 100

function getStateRules(state = {}) {
  return Array.isArray(state.rules) ? state.rules : []
}

function getStateCollections(state = {}) {
  return Array.isArray(state.collections) ? state.collections : []
}

function getActiveCollectionId(state = {}) {
  return String(state.settings?.activeCollectionId || '')
}

function getCaptureMode(state = {}) {
  const mode = String(state.captureMode || state.settings?.captureMode || 'auto')
  if (mode === 'cdp' || mode === 'full') return 'full'
  if (mode === 'compat' || mode === 'light') return 'light'
  return 'auto'
}

function getAiBridgePermissions(state = {}) {
  return state.aiBridgePermissions || {}
}

function sanitizeTabContext(tab = {}, permissions = {}) {
  if (!tab?.url) return null
  const urlParts = sanitizeAiBridgeRequest({ url: tab.url }, permissions)
  const hashParts = sanitizeHashRoute(tab.url)
  return {
    origin: urlParts.urlOrigin,
    path: urlParts.urlPath,
    hasQuery: urlParts.hasQuery,
    queryKeys: urlParts.queryKeys,
    ...hashParts
  }
}

function sanitizeHashRoute(url) {
  const raw = String(url || '')
  const hashIndex = raw.indexOf('#')
  if (hashIndex < 0) {
    return {
      hashPath: '',
      hasHashQuery: false,
      hashQueryKeys: []
    }
  }

  const hash = raw.slice(hashIndex + 1)
  const [hashWithoutQuery, query = ''] = hash.split('?')
  const hashPath = hashWithoutQuery.startsWith('/') ? hashWithoutQuery : `/${hashWithoutQuery}`.replace(/\/+$/, '')
  const hashQueryKeys = sanitizeAiBridgeQueryKeys(query)

  return {
    hashPath,
    hasHashQuery: query.length > 0,
    hashQueryKeys
  }
}

function countRulesByCollection(rules = []) {
  const counts = new Map()
  for (const rule of rules) {
    const collectionId = String(rule?.collectionId || '')
    if (!collectionId) continue
    counts.set(collectionId, (counts.get(collectionId) || 0) + 1)
  }
  return counts
}

export function listCapturedRequests({ state = {}, networkEntries = [] } = {}) {
  const permissions = getAiBridgePermissions(state)
  return getVisibleNetworkEntriesForCapture(state, Array.isArray(networkEntries) ? networkEntries : [])
    .slice(0, MAX_AI_BRIDGE_CAPTURED_REQUESTS)
    .map(entry => sanitizeAiBridgeRequest(entry, permissions))
}

export function listSanitizedLogs({ state = {}, logs = state.logs || [] } = {}) {
  const permissions = getAiBridgePermissions(state)
  return getVisibleLogsForCapture(state, Array.isArray(logs) ? logs : [])
    .slice(0, MAX_AI_BRIDGE_SANITIZED_LOGS)
    .map(log => sanitizeAiBridgeLog(log, permissions))
}

export function listRecentRuleResults({ state = {}, networkEntries = [] } = {}) {
  const permissions = getAiBridgePermissions(state)
  return getVisibleNetworkEntriesForCapture(state, Array.isArray(networkEntries) ? networkEntries : [])
    .slice(0, MAX_AI_BRIDGE_RECENT_RULE_RESULTS)
    .map(entry => sanitizeAiBridgeRuleResult(entry, permissions))
}

export function explainRuleMatchCommand({ state = {}, networkEntries = [], payload = {} } = {}) {
  return explainRuleMatch({ state, networkEntries, payload })
}

export function listCollections({ state = {} } = {}) {
  const rules = getStateRules(state)
  const activeCollectionId = getActiveCollectionId(state)
  const counts = countRulesByCollection(rules)

  return getStateCollections(state).map(collection => sanitizeAiBridgeCollection(collection, {
    ruleCount: counts.get(collection.id) || 0,
    active: collection.id === activeCollectionId
  }))
}

export function listRules({ state = {} } = {}) {
  return getStateRules(state).map(rule => sanitizeAiBridgeRule(rule))
}

export function getActiveCollection({ state = {} } = {}) {
  const activeCollectionId = getActiveCollectionId(state)
  const collections = listCollections({ state })
  const collection = collections.find(item => item.id === activeCollectionId) || null
  const activeRules = getStateRules(state).filter(rule => rule.collectionId === activeCollectionId)

  return {
    activeCollectionId,
    collection,
    ruleCount: activeRules.length,
    enabledRuleCount: activeRules.filter(rule => rule.enabled !== false).length,
    disabledRuleCount: activeRules.filter(rule => rule.enabled === false).length
  }
}

export function getCurrentTestContext({ state = {} } = {}) {
  const rules = getStateRules(state)
  const activeCollection = getActiveCollection({ state })
  const activeCapture = hasActiveCaptureContext(state)
  const permissions = getAiBridgePermissions(state)

  return {
    capture: {
      active: activeCapture,
      mode: getCaptureMode(state)
    },
    tab: activeCapture ? sanitizeTabContext(state.activeCaptureTab || state.activeTab, permissions) : null,
    activeCollection: activeCollection.collection
      ? {
          id: activeCollection.collection.id,
          name: activeCollection.collection.name,
          enabled: activeCollection.collection.enabled
        }
      : null,
    rules: {
      total: rules.length,
      activeCollectionTotal: activeCollection.ruleCount,
      activeCollectionEnabled: activeCollection.enabledRuleCount,
      activeCollectionDisabled: activeCollection.disabledRuleCount
    },
    aiBridge: {
      status: String(state.aiBridgeStatus || 'disabled')
    }
  }
}
