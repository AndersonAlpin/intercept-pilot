import {
  sanitizeAiBridgeLog,
  sanitizeAiBridgeRequest,
  sanitizeAiBridgeRule,
  sanitizeAiBridgeRuleResult
} from '../shared/ai-bridge-sanitize.js'

export const MAX_AI_BRIDGE_SEARCH_LIMIT = 100

function toStringValue(value) {
  return String(value ?? '')
}

function toLowerValue(value) {
  return toStringValue(value).toLowerCase()
}

function hasPayloadValue(payload = {}, key = '') {
  return payload[key] !== undefined && payload[key] !== null && payload[key] !== ''
}

function matchesText(value, query) {
  if (!hasPayloadValue({ query }, 'query')) return true
  return toLowerValue(value).includes(toLowerValue(query))
}

function matchesExactText(value, expected) {
  if (expected === undefined || expected === null || expected === '') return true
  return toLowerValue(value) === toLowerValue(expected)
}

function matchesBoolean(value, expected) {
  if (typeof expected !== 'boolean') return true
  return Boolean(value) === expected
}

function getUrlParts(url) {
  try {
    const parsed = new URL(String(url || ''))
    return {
      origin: parsed.origin,
      path: parsed.pathname,
      full: parsed.href
    }
  } catch {
    return {
      origin: '',
      path: '',
      full: String(url || '')
    }
  }
}

function getTimeValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : null
}

function matchesSince(value, since) {
  if (!since) return true
  const sinceValue = getTimeValue(since)
  if (sinceValue == null) return true
  const itemValue = getTimeValue(value)
  if (itemValue == null) return false
  return itemValue >= sinceValue
}

function matchesStatusGroup(status, statusGroup) {
  if (!statusGroup) return true
  const value = Number(status)
  if (!Number.isFinite(value)) return false
  const group = String(statusGroup || '').toLowerCase()
  if (!/^[1-5]xx$/.test(group)) return true
  return Math.floor(value / 100) === Number(group[0])
}

function matchesNumber(value, expected) {
  if (expected === undefined || expected === null || expected === '') return true
  return Number(value) === Number(expected)
}

export function normalizeSearchLimit(value, fallback = 50) {
  const limit = Number(value ?? fallback)
  if (!Number.isFinite(limit) || limit < 1) return fallback
  return Math.min(Math.floor(limit), MAX_AI_BRIDGE_SEARCH_LIMIT)
}

export function normalizeSearchOffset(value) {
  const offset = Number(value ?? 0)
  if (!Number.isFinite(offset) || offset < 0) return 0
  return Math.floor(offset)
}

export function paginateSearchResults(items = [], payload = {}) {
  const limit = normalizeSearchLimit(payload.limit)
  const offset = normalizeSearchOffset(payload.offset)
  const total = items.length
  return {
    items: items.slice(offset, offset + limit),
    total,
    limit,
    offset,
    hasMore: offset + limit < total
  }
}

function filterNetworkEntry(entry = {}, payload = {}) {
  const url = getUrlParts(entry.url)
  return matchesExactText(entry.method, payload.method)
    && matchesNumber(entry.status, payload.status)
    && matchesStatusGroup(entry.status, payload.statusGroup)
    && matchesExactText(entry.resourceType, payload.resourceType)
    && matchesText(url.full, payload.urlContains)
    && matchesText(url.path, payload.pathContains)
    && matchesExactText(url.origin, payload.origin)
    && matchesExactText(entry.matchedRuleId, payload.matchedRuleId)
    && matchesExactText(entry.matchedRuleName, payload.matchedRuleName)
    && matchesBoolean(entry.intercepted, payload.intercepted)
    && matchesExactText(entry.appliedAction, payload.appliedAction)
    && matchesBoolean(Boolean(entry.errorText || entry.errorType), payload.hasError)
    && matchesSince(entry.startedAt || entry.timestamp || entry.endedAt, payload.since)
}

function filterLog(log = {}, payload = {}) {
  const url = getUrlParts(log.url)
  return matchesExactText(log.level, payload.level)
    && matchesExactText(log.scope, payload.scope)
    && matchesText(log.message, payload.messageContains)
    && matchesText(url.full, payload.urlContains)
    && matchesSince(log.timestamp, payload.since)
}

function filterRuleResult(entry = {}, payload = {}) {
  const url = getUrlParts(entry.url)
  const matched = Boolean(entry.matchedRuleId || entry.matchedRuleName)
  return matchesExactText(entry.matchedRuleId, payload.ruleId)
    && matchesExactText(entry.matchedRuleName, payload.ruleName)
    && matchesExactText(entry.method, payload.method)
    && matchesExactText(entry.resourceType, payload.resourceType)
    && matchesNumber(entry.status, payload.status)
    && matchesExactText(entry.appliedAction, payload.appliedAction)
    && matchesBoolean(entry.intercepted, payload.intercepted)
    && matchesBoolean(matched, payload.matched)
    && matchesText(url.full, payload.urlContains)
    && matchesText(url.path, payload.pathContains)
    && matchesSince(entry.startedAt || entry.timestamp || entry.endedAt, payload.since)
}

function filterRule(rule = {}, payload = {}) {
  const diagnostics = rule.diagnostics || {}
  return matchesExactText(rule.collectionId, payload.collectionId)
    && matchesBoolean(rule.enabled !== false, payload.enabled)
    && matchesExactText(rule.match?.method, payload.method)
    && matchesExactText(rule.match?.resourceType, payload.resourceType)
    && matchesExactText(rule.match?.matchType, payload.matchType)
    && matchesText(rule.match?.urlPattern, payload.urlPatternContains)
    && matchesExactText(rule.action?.type, payload.actionType)
    && matchesText(rule.name, payload.nameContains)
    && matchesBoolean(Array.isArray(diagnostics.conflictIds) && diagnostics.conflictIds.length > 0, payload.hasConflict)
    && matchesBoolean(Boolean(diagnostics.lastError), typeof payload.lastError === 'boolean' ? payload.lastError : undefined)
    && (typeof payload.lastError === 'string' ? matchesText(diagnostics.lastError, payload.lastError) : true)
}

function createSearchResult(rawItems, payload, sanitizeItem) {
  const paginated = paginateSearchResults(rawItems, payload)
  return {
    ...paginated,
    items: paginated.items.map(sanitizeItem)
  }
}

export function searchCapturedRequestsCore({ networkEntries = [], permissions = {}, payload = {} } = {}) {
  const filtered = networkEntries.filter(entry => filterNetworkEntry(entry, payload))
  return createSearchResult(filtered, payload, entry => sanitizeAiBridgeRequest(entry, permissions))
}

export function searchSanitizedLogsCore({ logs = [], permissions = {}, payload = {} } = {}) {
  const filtered = logs.filter(log => filterLog(log, payload))
  return createSearchResult(filtered, payload, log => sanitizeAiBridgeLog(log, permissions))
}

export function searchRuleResultsCore({ networkEntries = [], permissions = {}, payload = {} } = {}) {
  const filtered = networkEntries.filter(entry => filterRuleResult(entry, payload))
  return createSearchResult(filtered, payload, entry => sanitizeAiBridgeRuleResult(entry, permissions))
}

export function searchRulesCore({ rules = [], payload = {} } = {}) {
  const filtered = rules.filter(rule => filterRule(rule, payload))
  return createSearchResult(filtered, payload, rule => sanitizeAiBridgeRule(rule))
}
