import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_AI_BRIDGE_CAPTURED_REQUESTS,
  MAX_AI_BRIDGE_RECENT_RULE_RESULTS,
  MAX_AI_BRIDGE_SANITIZED_LOGS,
  getActiveCollection,
  getCurrentTestContext,
  listCapturedRequests,
  listCollections,
  listRecentRuleResults,
  listRules,
  listSanitizedLogs
} from '../src/background/ai-bridge-commands.js'

const state = {
  attachedTabId: 42,
  networkMeta: {
    currentCaptureSessionId: 'cdp:42:session'
  },
  collections: [
    { id: 'collection-default', name: 'Default', description: 'Default scenarios', enabled: true, order: 0 },
    { id: 'collection-auth', name: 'Auth', description: 'Auth scenarios', enabled: false, order: 1 }
  ],
  settings: {
    activeCollectionId: 'collection-auth'
  },
  rules: [
    {
      id: 'rule-default',
      collectionId: 'collection-default',
      name: 'Default rule',
      enabled: true,
      priority: 100,
      match: { urlPattern: '/default', matchType: 'contains', method: 'GET', resourceType: 'ANY' },
      action: { type: 'passThrough' },
      diagnostics: { matchCount: 4, lastMatchedAt: '2026-06-19T10:00:00.000Z' }
    },
    {
      id: 'rule-auth',
      collectionId: 'collection-auth',
      name: 'Mock auth',
      enabled: false,
      priority: 200,
      match: { urlPattern: '/auth', matchType: 'contains', method: 'POST', resourceType: 'Fetch' },
      action: {
        type: 'mockResponse',
        statusCode: 401,
        statusText: 'Unauthorized',
        contentType: 'application/json',
        delayMs: 250,
        failReason: 'Failed',
        applyResponseBody: true,
        applyResponseHeaders: true,
        responseHeaders: 'Set-Cookie: secret',
        responseBody: '{"access_token":"secret"}'
      },
      diagnostics: {
        lastError: 'Mock failed once',
        conflictIds: ['rule-default'],
        matchCount: 2,
        lastMatchedAt: '2026-06-19T11:00:00.000Z'
      }
    }
  ]
}

test('listCapturedRequests returns only sanitized entries from the active capture context', () => {
  const requests = listCapturedRequests({
    state,
    networkEntries: [
      {
        id: 'active-entry',
        networkTabId: 42,
        captureSessionId: 'cdp:42:session',
        method: 'POST',
        url: 'https://internal.example.test/api/auth?token=secret-token&session=secret-session',
        status: 401,
        statusText: 'Unauthorized',
        resourceType: 'Fetch',
        durationMs: 123,
        startedAt: 1000,
        endedAt: 1123,
        intercepted: true,
        matchedRuleId: 'rule-auth',
        matchedRuleName: 'Mock auth',
        appliedAction: 'mockResponse',
        responseMimeType: 'application/json',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer secret' }],
        responseHeaders: [{ name: 'Set-Cookie', value: 'sid=secret' }],
        requestPostData: '{"password":"secret"}',
        responseBody: '{"access_token":"secret"}'
      },
      {
        id: 'stale-entry',
        networkTabId: 99,
        captureSessionId: 'old-session',
        method: 'GET',
        url: 'https://old.example.test/api?token=old-secret'
      }
    ]
  })

  assert.equal(requests.length, 1)
  assert.equal(requests[0].id, 'active-entry')
  assert.equal(requests[0].urlSanitized, 'https://internal.example.test/api/auth')
  assert.deepEqual(requests[0].queryKeys, ['token', 'session'])
  assert.equal(requests[0].requestHeadersPresent, true)
  assert.equal(requests[0].responseHeadersPresent, true)
  assert.equal(requests[0].requestBodyPresent, true)
  assert.equal(requests[0].responseBodyPresent, true)

  const serialized = JSON.stringify(requests)
  assert.doesNotMatch(serialized, /secret-token|secret-session|Bearer secret|sid=secret|password|access_token|old-secret/)
  assert.doesNotMatch(serialized, /"requestHeaders":|"responseHeaders":|"requestPostData":|"responseBody":/)
})

test('listCapturedRequests limits the response size for AI Bridge', () => {
  const networkEntries = Array.from({ length: MAX_AI_BRIDGE_CAPTURED_REQUESTS + 25 }, (_, index) => ({
    id: `entry-${index}`,
    networkTabId: 42,
    captureSessionId: 'cdp:42:session',
    method: 'GET',
    url: `https://internal.example.test/api/items/${index}?token=secret-${index}`
  }))

  const requests = listCapturedRequests({ state, networkEntries })

  assert.equal(requests.length, MAX_AI_BRIDGE_CAPTURED_REQUESTS)
  assert.equal(requests[0].id, 'entry-0')
  assert.equal(requests.at(-1).id, `entry-${MAX_AI_BRIDGE_CAPTURED_REQUESTS - 1}`)
  assert.doesNotMatch(JSON.stringify(requests), /secret-/)
})

test('listSanitizedLogs returns only sanitized logs from the active capture context', () => {
  const logs = listSanitizedLogs({
    state,
    logs: [
      {
        id: 'active-log',
        scope: 'web',
        level: 'error',
        message: 'Fetch failed token=secret-token Authorization: Bearer secret',
        url: 'https://internal.example.test/api/auth?token=secret-token&safe=value',
        timestamp: '2026-06-20T10:00:00.000Z',
        tabId: 42,
        captureSessionId: 'cdp:42:session',
        networkCycleId: 'cycle-active',
        stack: 'Error: secret stack',
        headers: { Authorization: 'Bearer secret' }
      },
      {
        id: 'old-log',
        scope: 'web',
        level: 'info',
        message: 'Old token=old-secret',
        url: 'https://old.example.test/api?token=old-secret',
        tabId: 99,
        captureSessionId: 'old-session'
      },
      {
        id: 'app-log',
        scope: 'app',
        level: 'info',
        message: 'Internal app token=app-secret',
        tabId: 42,
        captureSessionId: 'cdp:42:session'
      }
    ]
  })

  assert.equal(logs.length, 1)
  assert.equal(logs[0].id, 'active-log')
  assert.equal(logs[0].urlSanitized, 'https://internal.example.test/api/auth')
  assert.deepEqual(logs[0].queryKeys, ['token', 'safe'])
  assert.equal(logs[0].sensitiveContentRemoved, true)
  assert.equal(logs[0].captureSessionId, 'cdp:42:session')
  assert.equal(logs[0].networkCycleId, 'cycle-active')

  const serialized = JSON.stringify(logs)
  assert.doesNotMatch(serialized, /secret-token|safe=value|Bearer secret|secret stack|old-secret|app-secret|headers|stack|message":/i)
})

test('listSanitizedLogs limits the response size for AI Bridge', () => {
  const logs = Array.from({ length: MAX_AI_BRIDGE_SANITIZED_LOGS + 25 }, (_, index) => ({
    id: `log-${index}`,
    scope: 'web',
    level: 'info',
    message: `Loaded ${index} token=secret-${index}`,
    url: `https://internal.example.test/api/logs/${index}?token=secret-${index}`,
    tabId: 42,
    captureSessionId: 'cdp:42:session'
  }))

  const sanitized = listSanitizedLogs({ state, logs })

  assert.equal(sanitized.length, MAX_AI_BRIDGE_SANITIZED_LOGS)
  assert.equal(sanitized[0].id, 'log-0')
  assert.equal(sanitized.at(-1).id, `log-${MAX_AI_BRIDGE_SANITIZED_LOGS - 1}`)
  assert.doesNotMatch(JSON.stringify(sanitized), /secret-/)
})

test('listRecentRuleResults returns only safe rule result summaries from the active capture context', () => {
  const results = listRecentRuleResults({
    state,
    networkEntries: [
      {
        id: 'active-rule-result',
        networkTabId: 42,
        captureSessionId: 'cdp:42:session',
        method: 'POST',
        url: 'https://internal.example.test/api/auth?token=secret-token&safe=value',
        status: 401,
        statusText: 'Unauthorized',
        resourceType: 'Fetch',
        durationMs: 123,
        startedAt: 1000,
        endedAt: 1123,
        intercepted: true,
        matchedRuleId: 'rule-auth',
        matchedRuleName: 'Mock auth',
        appliedAction: 'mockResponse',
        requestHeaders: [{ name: 'Authorization', value: 'Bearer secret' }],
        responseHeaders: [{ name: 'Set-Cookie', value: 'sid=secret' }],
        requestPostData: '{"password":"secret"}',
        responseBody: '{"access_token":"secret"}'
      },
      {
        id: 'active-pass-through',
        networkTabId: 42,
        captureSessionId: 'cdp:42:session',
        method: 'GET',
        url: 'https://internal.example.test/api/pass?session=secret-session',
        status: 200,
        appliedAction: 'passThrough',
        intercepted: false
      },
      {
        id: 'stale-rule-result',
        networkTabId: 99,
        captureSessionId: 'old-session',
        method: 'GET',
        url: 'https://old.example.test/api?token=old-secret',
        matchedRuleId: 'old-rule',
        matchedRuleName: 'Old rule'
      }
    ]
  })

  assert.equal(results.length, 2)
  assert.deepEqual(results[0], {
    requestId: 'active-rule-result',
    ruleId: 'rule-auth',
    ruleName: 'Mock auth',
    urlSanitized: 'https://internal.example.test/api/auth',
    urlOrigin: 'https://internal.example.test',
    urlPath: '/api/auth',
    hasQuery: true,
    queryKeys: ['token', 'safe'],
    method: 'POST',
    resourceType: 'Fetch',
    status: 401,
    statusText: 'Unauthorized',
    appliedAction: 'mockResponse',
    intercepted: true,
    matched: true,
    startedAt: 1000,
    endedAt: 1123,
    durationMs: 123
  })
  assert.equal(results[1].matched, false)
  assert.equal(results[1].intercepted, false)

  const serialized = JSON.stringify(results)
  assert.doesNotMatch(serialized, /secret-token|safe=value|secret-session|Bearer secret|sid=secret|password|access_token|old-secret|requestHeaders|responseHeaders|requestPostData|responseBody/i)
})

test('listRecentRuleResults limits the response size for AI Bridge', () => {
  const networkEntries = Array.from({ length: MAX_AI_BRIDGE_RECENT_RULE_RESULTS + 25 }, (_, index) => ({
    id: `result-${index}`,
    networkTabId: 42,
    captureSessionId: 'cdp:42:session',
    method: 'GET',
    url: `https://internal.example.test/api/results/${index}?token=secret-${index}`,
    matchedRuleId: index % 2 === 0 ? 'rule-auth' : null,
    matchedRuleName: index % 2 === 0 ? 'Mock auth' : null,
    appliedAction: index % 2 === 0 ? 'mockResponse' : 'passThrough',
    intercepted: index % 2 === 0
  }))

  const results = listRecentRuleResults({ state, networkEntries })

  assert.equal(results.length, MAX_AI_BRIDGE_RECENT_RULE_RESULTS)
  assert.equal(results[0].requestId, 'result-0')
  assert.equal(results.at(-1).requestId, `result-${MAX_AI_BRIDGE_RECENT_RULE_RESULTS - 1}`)
  assert.doesNotMatch(JSON.stringify(results), /secret-/)
})

test('listCollections includes rule counts and active collection flag', () => {
  const collections = listCollections({ state })

  assert.deepEqual(collections, [
    {
      id: 'collection-default',
      name: 'Default',
      description: 'Default scenarios',
      enabled: true,
      order: 0,
      ruleCount: 1,
      active: false
    },
    {
      id: 'collection-auth',
      name: 'Auth',
      description: 'Auth scenarios',
      enabled: false,
      order: 1,
      ruleCount: 1,
      active: true
    }
  ])
})

test('listRules returns allowed rule fields only', () => {
  const rules = listRules({ state })
  const authRule = rules.find(rule => rule.id === 'rule-auth')

  assert.deepEqual(authRule, {
    id: 'rule-auth',
    collectionId: 'collection-auth',
    name: 'Mock auth',
    enabled: false,
    priority: 200,
    match: { urlPattern: '/auth', matchType: 'contains', method: 'POST', resourceType: 'Fetch' },
    action: {
      type: 'mockResponse',
      statusCode: 401,
      statusText: 'Unauthorized',
      contentType: 'application/json',
      delayMs: 250,
      failReason: 'Failed',
      applyResponseBody: true,
      applyResponseHeaders: true
    },
    diagnostics: {
      lastError: 'Mock failed once',
      conflictIds: ['rule-default']
    }
  })

  const serialized = JSON.stringify(rules)
  assert.doesNotMatch(serialized, /responseBody|responseHeaders|matchCount|lastMatchedAt|Set-Cookie|access_token/)
})

test('getActiveCollection returns sanitized active collection summary', () => {
  const active = getActiveCollection({ state })

  assert.deepEqual(active, {
    activeCollectionId: 'collection-auth',
    collection: {
      id: 'collection-auth',
      name: 'Auth',
      description: 'Auth scenarios',
      enabled: false,
      order: 1,
      ruleCount: 1,
      active: true
    },
    ruleCount: 1,
    enabledRuleCount: 0,
    disabledRuleCount: 1
  })
})

test('getCurrentTestContext returns sanitized capture, tab, collection and rule counts', () => {
  const context = getCurrentTestContext({
    state: {
      ...state,
      captureMode: 'full',
      aiBridgeStatus: 'connected',
      activeTab: {
        id: 42,
        url: 'https://app.example.test/checkout?token=secret-token&email=user@example.test',
        title: 'Checkout secret page'
      }
    }
  })

  assert.deepEqual(context, {
    capture: {
      active: true,
      mode: 'full'
    },
    tab: {
      origin: 'https://app.example.test',
      path: '/checkout',
      hasQuery: true,
      queryKeys: ['token', 'email'],
      hashPath: '',
      hasHashQuery: false,
      hashQueryKeys: []
    },
    activeCollection: {
      id: 'collection-auth',
      name: 'Auth',
      enabled: false
    },
    rules: {
      total: 2,
      activeCollectionTotal: 1,
      activeCollectionEnabled: 0,
      activeCollectionDisabled: 1
    },
    aiBridge: {
      status: 'connected'
    }
  })

  const serialized = JSON.stringify(context)
  assert.doesNotMatch(serialized, /secret-token|user@example|Checkout secret|tabId|Authorization|cookies|headers|body/i)
})

test('getCurrentTestContext returns sanitized SPA hash route without hash query values', () => {
  const context = getCurrentTestContext({
    state: {
      ...state,
      aiBridgeStatus: 'connected',
      activeTab: {
        id: 42,
        url: 'https://app.example.test/?beta=1&bare-query-secret#/security/anti-download?bare-hash-secret&token=secret-token&email=user@example.test',
        title: 'Security secret page'
      }
    }
  })

  assert.deepEqual(context.tab, {
    origin: 'https://app.example.test',
    path: '/',
    hasQuery: true,
    queryKeys: ['beta'],
    hashPath: '/security/anti-download',
    hasHashQuery: true,
    hashQueryKeys: ['token', 'email']
  })

  const serialized = JSON.stringify(context)
  assert.doesNotMatch(serialized, /beta=1|bare-query-secret|bare-hash-secret|secret-token|user@example|Security secret|#\/security|token=|email=/)
})

test('getCurrentTestContext handles missing capture context without exposing private URLs', () => {
  const context = getCurrentTestContext({
    state: {
      collections: [],
      rules: [],
      settings: {},
      activeTab: {
        id: 7,
        url: 'https://private.example.test/path?token=secret'
      },
      aiBridgeStatus: 'waiting'
    }
  })

  assert.deepEqual(context, {
    capture: {
      active: false,
      mode: 'auto'
    },
    tab: null,
    activeCollection: null,
    rules: {
      total: 0,
      activeCollectionTotal: 0,
      activeCollectionEnabled: 0,
      activeCollectionDisabled: 0
    },
    aiBridge: {
      status: 'waiting'
    }
  })

  assert.doesNotMatch(JSON.stringify(context), /private|secret/)
})
