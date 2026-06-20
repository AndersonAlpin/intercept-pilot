import { getVisibleNetworkEntriesForCapture } from '../shared/capture-context.js'
import {
  sanitizeAiBridgeCollection,
  sanitizeAiBridgeRequest,
  sanitizeAiBridgeRule
} from '../shared/ai-bridge-sanitize.js'

export const MAX_AI_BRIDGE_CAPTURED_REQUESTS = 100

function getStateRules(state = {}) {
  return Array.isArray(state.rules) ? state.rules : []
}

function getStateCollections(state = {}) {
  return Array.isArray(state.collections) ? state.collections : []
}

function getActiveCollectionId(state = {}) {
  return String(state.settings?.activeCollectionId || '')
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
  return getVisibleNetworkEntriesForCapture(state, Array.isArray(networkEntries) ? networkEntries : [])
    .slice(0, MAX_AI_BRIDGE_CAPTURED_REQUESTS)
    .map(entry => sanitizeAiBridgeRequest(entry))
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
