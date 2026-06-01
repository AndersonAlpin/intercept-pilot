import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizePerformanceEntries } from '../src/background/performance-entries.js'

test('performance entries are normalized into passive network rows', () => {
  const entries = normalizePerformanceEntries([
    {
      name: 'https://app.test/api/roles',
      initiatorType: 'fetch',
      startTime: 120,
      duration: 40,
      responseStatus: 200,
      transferSize: 1234
    },
    {
      name: 'data:image/png;base64,abc',
      initiatorType: 'img'
    }
  ], {
    tabId: 7,
    now: 1000,
    timeOrigin: 500
  })

  assert.equal(entries.length, 1)
  assert.equal(entries[0].url, 'https://app.test/api/roles')
  assert.equal(entries[0].method, 'GET')
  assert.equal(entries[0].status, 200)
  assert.equal(entries[0].resourceType, 'fetch')
  assert.equal(entries[0].source, 'performance')
  assert.equal(entries[0].networkTabId, 7)
  assert.equal(entries[0].startedAt, 620)
  assert.equal(entries[0].endedAt, 660)
})
