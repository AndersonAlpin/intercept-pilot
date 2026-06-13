import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveNetworkEntryResponseBody } from '../src/background/network-entry-body.js'

test('response body resolution waits for an entry to finish before reading CDP body', async () => {
  const entry = {
    source: 'cdp',
    requestId: 'request-1',
    networkId: 'network-1',
    endedAt: null
  }
  let sleepCount = 0
  const result = await resolveNetworkEntryResponseBody(entry, {
    waitMs: 100,
    intervalMs: 10,
    sleep: async () => {
      sleepCount += 1
      if (sleepCount === 2) entry.endedAt = Date.now()
    },
    fetchBody: async requestId => {
      assert.equal(requestId, 'network-1')
      return { body: '{"roles":[]}', base64Encoded: false }
    }
  })

  assert.equal(result.body, '{"roles":[]}')
  assert.equal(result.source, 'cdp')
  assert.equal(sleepCount, 2)
})

test('response body resolution reuses an already loaded entry body', async () => {
  const result = await resolveNetworkEntryResponseBody({
    responseBodyLoaded: 'loaded',
    responseBody: '{"cached":true}',
    responseBodyBase64Encoded: false
  }, {
    fetchBody: async () => {
      throw new Error('fetchBody should not be called')
    }
  })

  assert.equal(result.body, '{"cached":true}')
  assert.equal(result.source, 'entry')
})

test('compat response body resolution waits for the refreshed loaded entry', async () => {
  const originalEntry = {
    id: 'compat-entry',
    source: 'compat',
    responseBodyLoaded: 'idle',
    responseBody: null,
    endedAt: null
  }
  const loadedEntry = {
    ...originalEntry,
    responseBodyLoaded: 'loaded',
    responseBody: '{"roles":["admin"]}',
    endedAt: Date.now()
  }
  let currentEntry = originalEntry
  let sleepCount = 0

  const result = await resolveNetworkEntryResponseBody(originalEntry, {
    waitMs: 100,
    intervalMs: 10,
    getEntry: () => currentEntry,
    sleep: async () => {
      sleepCount += 1
      if (sleepCount === 2) currentEntry = loadedEntry
    }
  })

  assert.equal(result.body, '{"roles":["admin"]}')
  assert.equal(result.source, 'compat')
  assert.equal(sleepCount, 2)
})
