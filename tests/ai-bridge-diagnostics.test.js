import test from 'node:test'
import assert from 'node:assert/strict'

import { explainRuleMatch } from '../src/background/ai-bridge-diagnostics.js'

const collections = [
  { id: 'collection-active', name: 'Active', enabled: true },
  { id: 'collection-other', name: 'Other', enabled: true },
  { id: 'collection-disabled', name: 'Disabled', enabled: false }
]

const baseState = {
  attachedTabId: 42,
  networkMeta: {
    currentCaptureSessionId: 'cdp:42:session'
  },
  collections,
  settings: {
    activeCollectionId: 'collection-active'
  },
  rules: []
}

function makeRule(overrides = {}) {
  return {
    id: 'rule-checkout',
    collectionId: 'collection-active',
    name: 'Checkout success',
    enabled: true,
    priority: 100,
    match: {
      urlPattern: '/api/checkout',
      matchType: 'contains',
      method: 'GET',
      resourceType: 'ANY',
      ...(overrides.match || {})
    },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      responseHeaders: 'Authorization: secret',
      responseBody: '{"token":"secret"}',
      ...(overrides.action || {})
    },
    diagnostics: {
      lastError: 'secret error',
      ...(overrides.diagnostics || {})
    },
    ...overrides,
    match: {
      urlPattern: '/api/checkout',
      matchType: 'contains',
      method: 'GET',
      resourceType: 'ANY',
      ...(overrides.match || {})
    }
  }
}

function makeEntry(overrides = {}) {
  return {
    id: 'request-checkout',
    networkTabId: 42,
    captureSessionId: 'cdp:42:session',
    method: 'GET',
    url: 'https://example.test/api/checkout?token=secret-token&safe=value',
    resourceType: 'XHR',
    matchedRuleId: 'rule-checkout',
    matchedRuleName: 'Checkout success',
    appliedAction: 'mockResponse',
    intercepted: true,
    requestHeaders: [{ name: 'Authorization', value: 'Bearer secret' }],
    responseHeaders: [{ name: 'Set-Cookie', value: 'sid=secret' }],
    requestPostData: '{"password":"secret"}',
    responseBody: '{"access_token":"secret"}',
    ...overrides
  }
}

function explain({ rule = makeRule(), entry = makeEntry(), state = {}, payload = {} } = {}) {
  return explainRuleMatch({
    state: {
      ...baseState,
      rules: rule ? [rule] : [],
      ...state
    },
    networkEntries: entry ? [entry] : [],
    payload: {
      ruleId: rule?.id || 'rule-checkout',
      requestId: entry?.id || 'request-checkout',
      ...payload
    }
  })
}

function checkByName(result, name) {
  return result.checks.find(check => check.name === name)
}

test('explainRuleMatch returns high confidence when rule and request match safely', () => {
  const result = explain()

  assert.equal(result.matched, true)
  assert.equal(result.confidence, 'high')
  assert.equal(result.summary, 'The rule matches this request.')
  assert.deepEqual(result.rule, {
    id: 'rule-checkout',
    name: 'Checkout success',
    enabled: true,
    collectionId: 'collection-active',
    priority: 100
  })
  assert.deepEqual(result.request, {
    id: 'request-checkout',
    method: 'GET',
    urlSanitized: 'https://example.test/api/checkout',
    urlOrigin: 'https://example.test',
    urlPath: '/api/checkout',
    resourceType: 'XHR',
    hasQuery: true,
    queryKeys: ['token', 'safe']
  })
  assert.equal(checkByName(result, 'enabled').passed, true)
  assert.equal(checkByName(result, 'activeCollection').passed, true)
  assert.equal(checkByName(result, 'method').passed, true)
  assert.equal(checkByName(result, 'resourceType').passed, true)
  assert.equal(checkByName(result, 'url').passed, true)
  assert.deepEqual(result.likelyReasons, [])

  const serialized = JSON.stringify(result)
  assert.doesNotMatch(serialized, /secret-token|safe=value|Authorization|Set-Cookie|Bearer|password|access_token|responseBody|responseHeaders|requestHeaders|requestPostData|secret error/i)
})

test('explainRuleMatch treats method ANY and resourceType ANY as matches', () => {
  const result = explain({
    rule: makeRule({
      match: {
        method: 'ANY',
        resourceType: 'ANY'
      }
    }),
    entry: makeEntry({
      method: 'POST',
      resourceType: 'Fetch'
    })
  })

  assert.equal(result.matched, true)
  assert.equal(checkByName(result, 'method').passed, true)
  assert.equal(checkByName(result, 'resourceType').passed, true)
})

test('explainRuleMatch diagnoses method and resourceType mismatches with suggestions', () => {
  const result = explain({
    rule: makeRule({
      match: {
        method: 'GET',
        resourceType: 'Fetch'
      }
    }),
    entry: makeEntry({
      method: 'POST',
      resourceType: 'XHR',
      matchedRuleId: null,
      matchedRuleName: null,
      intercepted: false
    })
  })

  assert.equal(result.matched, false)
  assert.equal(result.confidence, 'high')
  assert.equal(checkByName(result, 'method').passed, false)
  assert.equal(checkByName(result, 'resourceType').passed, false)
  assert.match(result.likelyReasons.join(' '), /Rule expects method GET/)
  assert.match(result.likelyReasons.join(' '), /Rule expects resourceType Fetch/)
  assert.match(result.suggestions.join(' '), /Use resourceType ANY/)
})

test('explainRuleMatch supports equals, regex and glob URL diagnostics', () => {
  const equals = explain({
    rule: makeRule({ match: { matchType: 'equals', urlPattern: 'https://example.test/api/checkout' } }),
    entry: makeEntry({ url: 'https://example.test/api/checkout' })
  })
  const regex = explain({
    rule: makeRule({ match: { matchType: 'regex', urlPattern: '/api/check(out)?' } })
  })
  const glob = explain({
    rule: makeRule({ match: { matchType: 'glob', urlPattern: 'https://example.test/api/*' } })
  })

  assert.equal(checkByName(equals, 'url').passed, true)
  assert.equal(checkByName(regex, 'url').passed, true)
  assert.equal(checkByName(glob, 'url').passed, true)
})

test('explainRuleMatch reports URL mismatch and invalid regex safely', () => {
  const contains = explain({
    rule: makeRule({ match: { matchType: 'contains', urlPattern: '/api/missing' } })
  })
  const equals = explain({
    rule: makeRule({ match: { matchType: 'equals', urlPattern: 'https://example.test/api/missing' } })
  })
  const regex = explain({
    rule: makeRule({ match: { matchType: 'regex', urlPattern: '[' } })
  })

  assert.equal(checkByName(contains, 'url').passed, false)
  assert.equal(checkByName(equals, 'url').passed, false)
  assert.equal(checkByName(regex, 'url').passed, false)
  assert.match(checkByName(regex, 'url').message, /invalid regex/i)
  assert.doesNotMatch(JSON.stringify(regex), /token=secret-token|safe=value/)
})

test('explainRuleMatch reports missing rule and missing request safely', () => {
  const missingRule = explain({ rule: null })
  const missingRequest = explain({ entry: null })

  assert.equal(missingRule.matched, false)
  assert.equal(missingRule.confidence, 'low')
  assert.match(missingRule.summary, /Rule was not found/)
  assert.equal(missingRequest.matched, false)
  assert.equal(missingRequest.confidence, 'low')
  assert.match(missingRequest.summary, /Request was not found/)
})

test('explainRuleMatch reports disabled rules and inactive collections', () => {
  const disabledRule = explain({
    rule: makeRule({ enabled: false })
  })
  const otherCollection = explain({
    rule: makeRule({ collectionId: 'collection-other' })
  })
  const disabledCollection = explain({
    rule: makeRule({ collectionId: 'collection-disabled' }),
    state: {
      settings: { activeCollectionId: 'collection-disabled' }
    }
  })

  assert.equal(disabledRule.matched, false)
  assert.equal(checkByName(disabledRule, 'enabled').passed, false)
  assert.equal(otherCollection.matched, false)
  assert.equal(checkByName(otherCollection, 'activeCollection').passed, false)
  assert.equal(disabledCollection.matched, false)
  assert.equal(checkByName(disabledCollection, 'activeCollection').passed, false)
})

test('explainRuleMatch reports when another rule actually applied', () => {
  const result = explain({
    entry: makeEntry({
      matchedRuleId: 'rule-other',
      matchedRuleName: 'Other rule',
      intercepted: true
    })
  })

  assert.equal(result.matched, false)
  assert.equal(checkByName(result, 'actualAppliedRule').passed, false)
  assert.match(result.likelyReasons.join(' '), /Different rule applied/)
  assert.match(result.suggestions.join(' '), /Compare with the applied rule/)
})
