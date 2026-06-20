import test from 'node:test'
import assert from 'node:assert/strict'

import {
  MAX_AI_BRIDGE_CAPTURED_REQUESTS,
  getActiveCollection,
  listCapturedRequests,
  listCollections,
  listRules
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
