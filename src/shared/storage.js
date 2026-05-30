import { DEFAULT_COLLECTION_ID, DEFAULT_SETTINGS, STORAGE_KEYS } from './constants.js'
import { clone, parseNetworkIgnorePatterns } from './utils.js'
import { makeCollection, makeDefaultCollection, makeRule } from './models.js'
import { normalizeLocale, resolveLocale } from './i18n.js'

async function rawGet(keys) {
  return chrome.storage.local.get(keys)
}

async function rawSet(data) {
  return chrome.storage.local.set(data)
}

function normalizeCollections(stored) {
  if (Array.isArray(stored.collections) && stored.collections.length) {
    return stored.collections.map((item, index) => makeCollection({ ...item, order: Number(item.order ?? index) }))
  }

  // backward compatibility with old "folders"
  if (Array.isArray(stored.folders) && stored.folders.length) {
    return stored.folders.map((folder, index) => makeCollection({
      id: folder.id?.replace('folder-', 'collection-') || `collection-${index}`,
      name: folder.name || `Collection ${index + 1}`,
      enabled: folder.enabled !== false,
      order: Number(folder.order ?? index)
    }))
  }

  return [makeDefaultCollection()]
}

function migrateRuleCollectionId(rule, collections) {
  if (rule.collectionId) return rule.collectionId
  if (rule.folderId) {
    const mapped = String(rule.folderId).replace('folder-', 'collection-')
    if (collections.some(c => c.id === mapped)) return mapped
  }
  return collections[0]?.id || DEFAULT_COLLECTION_ID
}

function normalizeRules(stored, collections, settings) {
  const seed = Array.isArray(stored.rules) ? stored.rules : []
  return seed.map(item => makeRule({
    ...item,
    action: {
      ...item.action,
      type: item.action?.type || item.actionType || 'mockResponse',
      responseHeaders: Array.isArray(item.action?.responseHeaders)
        ? item.action.responseHeaders.map(h => `${h.name}: ${h.value}`).join('\n')
        : (item.action?.responseHeaders || '')
    },
    collectionId: migrateRuleCollectionId(item, collections)
  }, settings.activeCollectionId))
}

function normalizeSettings(stored, collections) {
  const settings = { ...DEFAULT_SETTINGS, ...(stored.settings || {}) }
  settings.language = stored.settings?.language
    ? normalizeLocale(stored.settings.language) || DEFAULT_SETTINGS.language
    : resolveLocale()
  if (!['cdp', 'compat', 'auto'].includes(settings.captureMode)) settings.captureMode = DEFAULT_SETTINGS.captureMode
  settings.networkFilters = {
    fullApp: {
      ...DEFAULT_SETTINGS.networkFilters.fullApp,
      ...(settings.networkFilters?.fullApp || {})
    },
    sidepanel: {
      ...DEFAULT_SETTINGS.networkFilters.sidepanel,
      ...(settings.networkFilters?.sidepanel || {})
    }
  }
  settings.networkIgnorePatterns = parseNetworkIgnorePatterns(settings.networkIgnorePatterns)
  if (!collections.some(c => c.id === settings.activeCollectionId)) {
    settings.activeCollectionId = collections[0]?.id || DEFAULT_COLLECTION_ID
  }
  return settings
}

export async function ensureState() {
  const stored = await rawGet(['collections', 'folders', 'rules', 'settings', 'logs'])
  const collections = normalizeCollections(stored)
  const settings = normalizeSettings(stored, collections)
  const rules = normalizeRules(stored, collections, settings)
  const logs = Array.isArray(stored.logs) ? stored.logs : []

  await rawSet({
    [STORAGE_KEYS.collections]: collections,
    [STORAGE_KEYS.rules]: rules,
    [STORAGE_KEYS.settings]: settings,
    [STORAGE_KEYS.logs]: logs
  })

  return { collections, rules, settings, logs }
}

export async function getState() {
  const stored = await rawGet([STORAGE_KEYS.collections, STORAGE_KEYS.rules, STORAGE_KEYS.settings, STORAGE_KEYS.logs])
  if (!Array.isArray(stored.collections) || !Array.isArray(stored.rules) || !stored.settings) {
    return ensureState()
  }
  const collections = clone(stored.collections)
  const settings = normalizeSettings(stored, collections)
  return {
    collections,
    rules: clone(stored.rules),
    settings,
    logs: Array.isArray(stored.logs) ? clone(stored.logs) : []
  }
}

export async function setState(state) {
  await rawSet({
    [STORAGE_KEYS.collections]: state.collections,
    [STORAGE_KEYS.rules]: state.rules,
    [STORAGE_KEYS.settings]: state.settings,
    [STORAGE_KEYS.logs]: state.logs
  })
}

export function subscribeToStateChanges(callback) {
  const handler = (changes, areaName) => {
    if (areaName !== 'local') return
    callback(changes)
  }
  chrome.storage.onChanged.addListener(handler)
  return () => chrome.storage.onChanged.removeListener(handler)
}

export async function getCollections() {
  return (await getState()).collections
}

export async function saveCollection(collection) {
  const state = await getState()
  const next = makeCollection(collection)
  const idx = state.collections.findIndex(item => item.id === next.id)
  if (idx === -1) state.collections.push(next)
  else state.collections[idx] = { ...state.collections[idx], ...next }
  await setState(state)
  return state.collections
}

export async function replaceCollectionContents(collection, rules = []) {
  const state = await getState()
  const idx = state.collections.findIndex(item => item.id === collection?.id)
  if (idx === -1) {
    return {
      collections: state.collections,
      rules: state.rules
    }
  }

  const currentCollection = state.collections[idx]
  const nextCollection = makeCollection({
    ...currentCollection,
    ...collection,
    id: currentCollection.id,
    order: currentCollection.order,
    createdAt: currentCollection.createdAt
  })
  state.collections[idx] = { ...currentCollection, ...nextCollection }

  const preservedRules = state.rules.filter(rule => rule.collectionId !== currentCollection.id)
  const usedRuleIds = new Set(preservedRules.map(rule => rule.id))
  const nextRules = []

  for (const rule of Array.isArray(rules) ? rules : []) {
    const nextId = rule?.id && !usedRuleIds.has(rule.id) ? rule.id : null
    const nextRule = makeRule({
      ...rule,
      id: nextId,
      collectionId: currentCollection.id
    }, state.settings.activeCollectionId)
    usedRuleIds.add(nextRule.id)
    nextRules.push(nextRule)
  }

  state.rules = [...nextRules, ...preservedRules]
  await setState(state)
  return {
    collections: state.collections,
    rules: state.rules
  }
}

export async function deleteCollection(collectionId) {
  const state = await getState()
  if (collectionId === DEFAULT_COLLECTION_ID) return state.collections

  state.collections = state.collections.filter(collection => collection.id !== collectionId)
  if (!state.collections.length) state.collections = [makeDefaultCollection()]

  const fallback = state.collections[0].id
  state.rules = state.rules.filter(rule => rule.collectionId !== collectionId)

  if (state.settings.activeCollectionId === collectionId) state.settings.activeCollectionId = fallback
  await setState(state)
  return state.collections
}

export async function getRules() {
  return (await getState()).rules
}

export async function saveRule(rule) {
  const state = await getState()
  const activeCollectionId = state.settings.activeCollectionId
  const next = makeRule(rule, activeCollectionId)
  const idx = state.rules.findIndex(item => item.id === next.id)
  if (idx === -1) state.rules.unshift(next)
  else state.rules[idx] = { ...state.rules[idx], ...next, updatedAt: new Date().toISOString() }
  await setState(state)
  return state.rules
}

export async function deleteRule(ruleId) {
  const state = await getState()
  state.rules = state.rules.filter(rule => rule.id !== ruleId)
  await setState(state)
  return state.rules
}

export async function updateRuleEnabled(ruleId, enabled) {
  const state = await getState()
  const nextEnabled = enabled !== false
  state.rules = state.rules.map(rule => {
    if (rule.id !== ruleId) return rule

    const nextRule = {
      ...rule,
      enabled: nextEnabled,
      updatedAt: new Date().toISOString()
    }

    if (nextEnabled && rule.enabled === false) {
      nextRule.diagnostics = {
        ...(rule.diagnostics || {}),
        lastMatchedAt: null
      }
    }

    return nextRule
  })
  await setState(state)
  return state.rules
}

export async function getActiveCollectionId() {
  return (await getState()).settings.activeCollectionId
}

export async function setActiveCollectionId(collectionId) {
  const state = await getState()
  if (!state.collections.some(c => c.id === collectionId)) return state.settings.activeCollectionId
  state.settings.activeCollectionId = collectionId
  await setState(state)
  return collectionId
}

export async function updateSettings(patch = {}) {
  const state = await getState()
  state.settings = { ...state.settings, ...patch }
  if ('language' in patch) {
    state.settings.language = normalizeLocale(patch.language) || resolveLocale()
  }
  await setState(state)
  return state.settings
}

export async function getLogs() {
  return (await getState()).logs
}

export async function setLogs(logs) {
  const state = await getState()
  state.logs = logs
  await setState(state)
  return logs
}
