import { safeRegex, globToRegex } from '../shared/utils.js'

function matchesUrl(url, rule) {
  const pattern = String(rule?.match?.urlPattern || '')
  const type = rule?.match?.matchType || 'contains'
  if (!pattern) return false

  if (type === 'equals') return url === pattern
  if (type === 'regex') {
    const regex = safeRegex(pattern)
    return regex ? regex.test(url) : false
  }
  if (type === 'glob') {
    try {
      return globToRegex(pattern).test(url)
    } catch {
      return false
    }
  }
  return url.includes(pattern)
}

function matchesMethod(method, rule) {
  const expected = rule?.match?.method || 'ANY'
  return expected === 'ANY' || String(method).toUpperCase() === String(expected).toUpperCase()
}

function matchesResourceType(resourceType, rule) {
  const expected = rule?.match?.resourceType || 'ANY'
  return expected === 'ANY' || String(resourceType || '').toLowerCase() === String(expected).toLowerCase()
}

export function sortRulesByPriority(rules = []) {
  return [...rules].sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
}

export function detectSimpleConflicts(rules = []) {
  const byKey = new Map()
  for (const rule of rules) {
    if (!rule.enabled) continue
    const key = `${rule.match?.method || 'ANY'}|${rule.match?.matchType || 'contains'}|${rule.match?.urlPattern || ''}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(rule.id)
  }

  const conflicts = new Map()
  for (const ids of byKey.values()) {
    if (ids.length < 2) continue
    for (const id of ids) {
      conflicts.set(id, ids.filter(other => other !== id))
    }
  }
  return conflicts
}

export function findMatchingRule(rules, collections, url, method, resourceType) {
  const enabledCollectionIds = new Set(collections.filter(collection => collection.enabled !== false).map(collection => collection.id))
  for (const rule of sortRulesByPriority(rules)) {
    if (!rule.enabled) continue
    if (!enabledCollectionIds.has(rule.collectionId)) continue
    if (!matchesUrl(url, rule)) continue
    if (!matchesMethod(method, rule)) continue
    if (!matchesResourceType(resourceType, rule)) continue
    return rule
  }
  return null
}
