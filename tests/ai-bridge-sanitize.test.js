import test from 'node:test'
import assert from 'node:assert/strict'

import {
  sanitizeAiBridgeLog,
  sanitizeAiBridgeRequest,
  sanitizeAiBridgeRule,
  sanitizeAiBridgeRuleResult
} from '../src/shared/ai-bridge-sanitize.js'

const sensitiveQueryUrl = 'https://private.example.test/api/users?token=tok_123&access_token=access_123&refresh_token=refresh_123&api_key=key_123&secret=secret_123&code=code_123&session=session_123&auth=auth_123&safe=value'

test('sanitizeAiBridgeRequest removes query values and keeps only query keys', () => {
  const sanitized = sanitizeAiBridgeRequest({
    id: 'entry-1',
    method: 'POST',
    url: sensitiveQueryUrl,
    requestHeaders: [],
    responseHeaders: []
  })

  assert.equal(sanitized.urlSanitized, 'https://private.example.test/api/users')
  assert.equal(sanitized.urlOrigin, 'https://private.example.test')
  assert.equal(sanitized.urlPath, '/api/users')
  assert.equal(sanitized.hasQuery, true)
  assert.deepEqual(sanitized.queryKeys, [
    'token',
    'access_token',
    'refresh_token',
    'api_key',
    'secret',
    'code',
    'session',
    'auth',
    'safe'
  ])

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /tok_123|access_123|refresh_123|key_123|secret_123|code_123|session_123|auth_123|safe=value/)
})

test('sanitizeAiBridgeRequest does not expose bare query tokens as query keys', () => {
  const sanitized = sanitizeAiBridgeRequest({
    id: 'entry-bare-query',
    method: 'GET',
    url: 'https://pilot-staging.example.test/ai/chat/usage?4f9b867746ccaa455553285dad8dd0cad6158fe48a24aab98f97461e68e60f91&safe=value&debug',
    requestHeaders: [],
    responseHeaders: []
  })

  assert.equal(sanitized.urlSanitized, 'https://pilot-staging.example.test/ai/chat/usage')
  assert.equal(sanitized.hasQuery, true)
  assert.deepEqual(sanitized.queryKeys, ['safe'])

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /4f9b867746ccaa455553285dad8dd0cad6158fe48a24aab98f97461e68e60f91|safe=value|debug/)
})

test('sanitizeAiBridgeRequest never exposes sensitive header values or raw headers', () => {
  const sanitized = sanitizeAiBridgeRequest({
    id: 'entry-headers',
    url: 'https://example.test/api',
    requestHeaders: [
      { name: 'Authorization', value: 'Bearer secret-token' },
      { name: 'COOKIE', value: 'sid=secret-cookie' }
    ],
    responseHeaders: [
      { name: 'set-cookie', value: 'refresh=secret-refresh' },
      { name: 'Content-Type', value: 'application/json' }
    ]
  })

  assert.equal(sanitized.requestHeadersPresent, true)
  assert.equal(sanitized.responseHeadersPresent, true)
  assert.equal('requestHeaders' in sanitized, false)
  assert.equal('responseHeaders' in sanitized, false)

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /Bearer secret-token|sid=secret-cookie|refresh=secret-refresh|Authorization|COOKIE|set-cookie/i)
})

test('sanitizeAiBridgeRequest exposes only body presence and truncation flags', () => {
  const sanitized = sanitizeAiBridgeRequest({
    id: 'entry-body',
    url: 'https://example.test/api',
    requestPostData: '{"password":"secret"}',
    requestPostDataTruncated: true,
    responseBody: '{"token":"secret"}',
    responseBodyTruncated: true
  })

  assert.equal(sanitized.requestBodyPresent, true)
  assert.equal(sanitized.responseBodyPresent, true)
  assert.equal(sanitized.requestBodyTruncated, true)
  assert.equal(sanitized.responseBodyTruncated, true)
  assert.equal('requestPostData' in sanitized, false)
  assert.equal('responseBody' in sanitized, false)

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /password|secret|token/)
})

test('sanitizeAiBridgeRequest exposes query values, headers and truncated bodies only when permitted', () => {
  const sanitized = sanitizeAiBridgeRequest({
    id: 'entry-permitted',
    method: 'POST',
    url: 'https://example.test/api?token=secret-token&safe=value',
    requestHeaders: [{ name: 'Authorization', value: 'Bearer secret-token' }],
    responseHeaders: [{ name: 'Set-Cookie', value: 'sid=secret-cookie' }],
    requestPostData: `{"payload":"${'x'.repeat(1200)}"}`,
    responseBody: `{"result":"${'y'.repeat(1200)}"}`
  }, {
    allowQueryValuesThisSession: true,
    allowRequestHeadersThisSession: true,
    allowResponseHeadersThisSession: true,
    allowRequestBodyThisSession: true,
    allowResponseBodyThisSession: true
  })

  assert.deepEqual(sanitized.queryValues, { token: 'secret-token', safe: 'value' })
  assert.deepEqual(sanitized.requestHeaders, [{ name: 'Authorization', value: 'Bearer secret-token', truncated: false }])
  assert.deepEqual(sanitized.responseHeaders, [{ name: 'Set-Cookie', value: 'sid=secret-cookie', truncated: false }])
  assert.equal(sanitized.requestBody.releasedByPermission, true)
  assert.equal(sanitized.requestBody.truncated, true)
  assert.equal(sanitized.responseBody.releasedByPermission, true)
  assert.equal(sanitized.responseBody.truncated, true)
  assert.equal(sanitized.permissionsApplied.queryValues, true)
  assert.equal(sanitized.permissionsApplied.requestHeaders, true)
  assert.equal(sanitized.permissionsApplied.responseHeaders, true)
  assert.equal(sanitized.permissionsApplied.requestBody, true)
  assert.equal(sanitized.permissionsApplied.responseBody, true)
})

test('sanitizeAiBridgeRule omits response body, response headers and runtime hit diagnostics', () => {
  const sanitized = sanitizeAiBridgeRule({
    id: 'rule-1',
    collectionId: 'collection-1',
    name: 'Mock profile',
    enabled: true,
    priority: 100,
    match: {
      urlPattern: '/api/profile',
      matchType: 'contains',
      method: 'GET',
      resourceType: 'Fetch'
    },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      statusText: 'OK',
      contentType: 'application/json',
      delayMs: 0,
      failReason: 'Failed',
      applyResponseBody: true,
      applyResponseHeaders: true,
      responseHeaders: 'Authorization: secret',
      responseBody: '{"token":"secret"}'
    },
    diagnostics: {
      lastError: 'Previous error',
      conflictIds: ['rule-2'],
      matchCount: 9,
      lastMatchedAt: '2026-06-19T10:00:00.000Z'
    }
  })

  assert.deepEqual(sanitized, {
    id: 'rule-1',
    collectionId: 'collection-1',
    name: 'Mock profile',
    enabled: true,
    priority: 100,
    match: {
      urlPattern: '/api/profile',
      matchType: 'contains',
      method: 'GET',
      resourceType: 'Fetch'
    },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      statusText: 'OK',
      contentType: 'application/json',
      delayMs: 0,
      failReason: 'Failed',
      applyResponseBody: true,
      applyResponseHeaders: true
    },
    diagnostics: {
      lastError: 'Previous error',
      conflictIds: ['rule-2']
    }
  })

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /responseBody|responseHeaders|matchCount|lastMatchedAt|secret/)
})

test('sanitizeAiBridgeLog exposes only safe fields and redacts sensitive message content', () => {
  const sanitized = sanitizeAiBridgeLog({
    id: 'log-1',
    scope: 'web',
    level: 'error',
    message: `Fetch failed for https://private.example.test/api/users?token=tok_123&safe=value Authorization: Bearer secret-token password="secret-password" ${'x'.repeat(420)}`,
    url: 'https://private.example.test/api/users?token=tok_123&safe=value',
    timestamp: '2026-06-20T10:00:00.000Z',
    tabId: 42,
    captureSessionId: 'cdp:42:session',
    networkCycleId: 'cycle-1',
    stack: 'Error: secret stack at private.js:1',
    payload: { token: 'secret' },
    headers: { Authorization: 'Bearer secret-token' }
  })

  assert.deepEqual(Object.keys(sanitized).sort(), [
    'captureSessionId',
    'hasQuery',
    'id',
    'level',
    'messageSanitized',
    'messageTruncated',
    'networkCycleId',
    'queryKeys',
    'scope',
    'sensitiveContentRemoved',
    'timestamp',
    'urlOrigin',
    'urlPath',
    'urlSanitized'
  ].sort())
  assert.equal(sanitized.urlSanitized, 'https://private.example.test/api/users')
  assert.equal(sanitized.urlOrigin, 'https://private.example.test')
  assert.equal(sanitized.urlPath, '/api/users')
  assert.equal(sanitized.hasQuery, true)
  assert.deepEqual(sanitized.queryKeys, ['token', 'safe'])
  assert.equal(sanitized.messageTruncated, true)
  assert.equal(sanitized.sensitiveContentRemoved, true)

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /tok_123|safe=value|secret-token|secret-password|secret stack|payload|headers|Authorization|Bearer/i)
})

test('sanitizeAiBridgeRuleResult exposes safe rule result fields without headers, bodies or query values', () => {
  const sanitized = sanitizeAiBridgeRuleResult({
    id: 'request-1',
    method: 'POST',
    url: 'https://private.example.test/api/auth?token=tok_123&safe=value',
    resourceType: 'Fetch',
    status: 401,
    statusText: 'Unauthorized',
    startedAt: 1000,
    endedAt: 1125,
    durationMs: 125,
    intercepted: true,
    matchedRuleId: 'rule-auth',
    matchedRuleName: 'Mock auth',
    appliedAction: 'mockResponse',
    requestHeaders: [{ name: 'Authorization', value: 'Bearer secret-token' }],
    responseHeaders: [{ name: 'Set-Cookie', value: 'sid=secret' }],
    requestPostData: '{"password":"secret"}',
    responseBody: '{"access_token":"secret"}'
  })

  assert.deepEqual(sanitized, {
    requestId: 'request-1',
    ruleId: 'rule-auth',
    ruleName: 'Mock auth',
    urlSanitized: 'https://private.example.test/api/auth',
    urlOrigin: 'https://private.example.test',
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
    endedAt: 1125,
    durationMs: 125
  })

  const serialized = JSON.stringify(sanitized)
  assert.doesNotMatch(serialized, /tok_123|safe=value|Authorization|Set-Cookie|Bearer|password|access_token|requestHeaders|responseHeaders|requestPostData|responseBody/i)
})
