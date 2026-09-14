import { getVisibleNetworkEntriesForCapture } from '../shared/capture-context.js'
import { sanitizeAiBridgeRequest } from '../shared/ai-bridge-sanitize.js'
import { globToRegex, safeRegex } from '../shared/utils.js'

function toStringValue(value) {
  return String(value ?? '')
}

function getActiveCollectionId(state = {}) {
  return String(state.settings?.activeCollectionId || state.collections?.[0]?.id || '')
}

function getCollection(state = {}, collectionId = '') {
  return (Array.isArray(state.collections) ? state.collections : []).find(collection => collection.id === collectionId) || null
}

function createCheck(name, passed, ruleValue, requestValue, message) {
  return {
    name,
    passed,
    ruleValue,
    requestValue,
    message
  }
}

function sanitizeRuleUrlPattern(pattern, permissions = {}) {
  const value = toStringValue(pattern)
  if (!value.includes('?')) return value
  const sanitized = sanitizeAiBridgeRequest({ url: value }, permissions)
  return sanitized.urlSanitized || sanitized.urlPath || value.split('?')[0]
}

function sanitizeRuleSummary(rule = {}) {
  return {
    id: toStringValue(rule.id),
    name: toStringValue(rule.name),
    enabled: rule.enabled !== false,
    collectionId: toStringValue(rule.collectionId),
    priority: Number(rule.priority ?? 0)
  }
}

function sanitizeRequestSummary(entry = {}, permissions = {}) {
  const request = sanitizeAiBridgeRequest(entry, permissions)
  return {
    id: request.id,
    method: request.method,
    urlSanitized: request.urlSanitized,
    urlOrigin: request.urlOrigin,
    urlPath: request.urlPath,
    resourceType: request.resourceType,
    hasQuery: request.hasQuery,
    queryKeys: request.queryKeys,
    ...(request.queryValues ? { queryValues: request.queryValues } : {}),
    ...(request.permissionsApplied ? { permissionsApplied: request.permissionsApplied } : {})
  }
}

function matchMethod(ruleMethod, requestMethod) {
  const expected = toStringValue(ruleMethod || 'ANY').toUpperCase()
  const actual = toStringValue(requestMethod).toUpperCase()
  return expected === 'ANY' || expected === actual
}

function matchResourceType(ruleResourceType, requestResourceType) {
  const expected = toStringValue(ruleResourceType || 'ANY')
  const actual = toStringValue(requestResourceType)
  return expected === 'ANY' || expected.toLowerCase() === actual.toLowerCase()
}

function matchUrl(rule = {}, entry = {}) {
  const pattern = toStringValue(rule.match?.urlPattern)
  const type = toStringValue(rule.match?.matchType || 'contains')
  const url = toStringValue(entry.url)

  if (!pattern) {
    return {
      passed: false,
      message: 'Rule URL pattern is empty.'
    }
  }

  if (type === 'equals') {
    return {
      passed: url === pattern,
      message: url === pattern ? 'URL matches exactly.' : 'URL does not match exactly.'
    }
  }

  if (type === 'regex') {
    const regex = safeRegex(pattern)
    if (!regex) {
      return {
        passed: false,
        message: 'Rule URL pattern is an invalid regex.'
      }
    }
    const passed = regex.test(url)
    return {
      passed,
      message: passed ? 'URL matches the regex pattern.' : 'URL does not match the regex pattern.'
    }
  }

  if (type === 'glob') {
    try {
      const passed = globToRegex(pattern).test(url)
      return {
        passed,
        message: passed ? 'URL matches the glob pattern.' : 'URL does not match the glob pattern.'
      }
    } catch {
      return {
        passed: false,
        message: 'Rule URL pattern is an invalid glob.'
      }
    }
  }

  const passed = url.includes(pattern)
  return {
    passed,
    message: passed ? 'URL contains the rule pattern.' : 'URL does not contain the rule pattern.'
  }
}

function missingResult(summary, options = {}) {
  return {
    matched: false,
    confidence: 'low',
    summary,
    rule: options.rule || null,
    request: options.request || null,
    checks: [],
    likelyReasons: [summary],
    suggestions: []
  }
}

function addReasonAndSuggestion(check, likelyReasons, suggestions) {
  if (check.passed) return
  likelyReasons.push(check.message)
  if (check.name === 'enabled') {
    suggestions.push('Enable the rule before expecting it to intercept requests.')
  }
  if (check.name === 'activeCollection') {
    suggestions.push('Move the rule to the active enabled collection or switch the active collection manually in InterceptPilot.')
  }
  if (check.name === 'method') {
    suggestions.push('Use method ANY if this rule should match multiple HTTP methods.')
  }
  if (check.name === 'resourceType') {
    suggestions.push('Use resourceType ANY unless you need to target only Fetch requests.')
  }
  if (check.name === 'url') {
    suggestions.push('Review the rule URL pattern and matchType against the sanitized request path.')
  }
  if (check.name === 'actualAppliedRule') {
    suggestions.push('Compare with the applied rule or adjust priorities if this rule should win.')
  }
}

export function explainRuleMatch({ state = {}, networkEntries = [], payload = {} } = {}) {
  const ruleId = toStringValue(payload.ruleId)
  const requestId = toStringValue(payload.requestId)
  const rules = Array.isArray(state.rules) ? state.rules : []
  const permissions = state.aiBridgePermissions || {}
  const visibleEntries = getVisibleNetworkEntriesForCapture(state, Array.isArray(networkEntries) ? networkEntries : [])
  const rule = rules.find(item => item.id === ruleId) || null
  const entry = visibleEntries.find(item => item.id === requestId) || null

  if (!rule) {
    return missingResult('Rule was not found.', {
      request: entry ? sanitizeRequestSummary(entry, permissions) : null
    })
  }

  const ruleSummary = sanitizeRuleSummary(rule)
  if (!entry) {
    return missingResult('Request was not found in the active capture context.', {
      rule: ruleSummary
    })
  }

  const requestSummary = sanitizeRequestSummary(entry, permissions)
  const activeCollectionId = getActiveCollectionId(state)
  const activeCollection = getCollection(state, activeCollectionId)
  const ruleCollection = getCollection(state, rule.collectionId)
  const methodPassed = matchMethod(rule.match?.method, entry.method)
  const resourceTypePassed = matchResourceType(rule.match?.resourceType, entry.resourceType)
  const urlMatch = matchUrl(rule, entry)
  const actualRuleId = entry.matchedRuleId || null
  const actualRuleName = entry.matchedRuleName || null
  const actualRuleMatches = !actualRuleId || actualRuleId === rule.id
  const checks = [
    createCheck(
      'enabled',
      rule.enabled !== false,
      rule.enabled !== false,
      null,
      rule.enabled !== false ? 'Rule is enabled.' : 'Rule is disabled.'
    ),
    createCheck(
      'activeCollection',
      Boolean(activeCollection && activeCollection.enabled !== false && rule.collectionId === activeCollectionId && ruleCollection?.enabled !== false),
      rule.collectionId || null,
      activeCollectionId || null,
      activeCollection?.enabled === false || ruleCollection?.enabled === false
        ? 'Rule collection is disabled.'
        : rule.collectionId === activeCollectionId
          ? 'Rule belongs to the active enabled collection.'
          : 'Rule does not belong to the active collection.'
    ),
    createCheck(
      'method',
      methodPassed,
      toStringValue(rule.match?.method || 'ANY'),
      toStringValue(entry.method),
      methodPassed
        ? 'Method matches.'
        : `Rule expects method ${toStringValue(rule.match?.method || 'ANY')}, but the request was ${toStringValue(entry.method)}.`
    ),
    createCheck(
      'resourceType',
      resourceTypePassed,
      toStringValue(rule.match?.resourceType || 'ANY'),
      toStringValue(entry.resourceType),
      resourceTypePassed
        ? 'Resource type matches.'
        : `Rule expects resourceType ${toStringValue(rule.match?.resourceType || 'ANY')}, but the request was ${toStringValue(entry.resourceType)}.`
    ),
    createCheck(
      'url',
      urlMatch.passed,
      {
        matchType: toStringValue(rule.match?.matchType || 'contains'),
        urlPattern: sanitizeRuleUrlPattern(rule.match?.urlPattern, permissions)
      },
      requestSummary.urlSanitized,
      urlMatch.message
    ),
    createCheck(
      'actualAppliedRule',
      actualRuleMatches,
      rule.id,
      actualRuleId ? { id: actualRuleId, name: toStringValue(actualRuleName) } : null,
      actualRuleMatches
        ? 'No different rule is recorded as applied for this request.'
        : `Different rule applied: ${toStringValue(actualRuleName || actualRuleId)}.`
    )
  ]
  const likelyReasons = []
  const suggestions = []
  for (const check of checks) addReasonAndSuggestion(check, likelyReasons, suggestions)
  const matched = checks.every(check => check.passed)

  return {
    matched,
    confidence: 'high',
    summary: matched ? 'The rule matches this request.' : 'The rule likely did not apply to this request.',
    rule: ruleSummary,
    request: requestSummary,
    checks,
    likelyReasons,
    suggestions: [...new Set(suggestions)]
  }
}
