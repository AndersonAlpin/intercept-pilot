import test from 'node:test'
import assert from 'node:assert/strict'

import { sanitizeAiBridgeRequest, sanitizeAiBridgeRule } from '../src/shared/ai-bridge-sanitize.js'

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
