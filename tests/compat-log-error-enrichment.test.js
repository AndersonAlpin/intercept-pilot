import test from 'node:test'
import assert from 'node:assert/strict'

import { enrichFetchErrorLog } from '../src/background/compat-log-error-enrichment.js'

test('enriches compat FetchError logs with the related JSON API error', async () => {
  const message =
    'FetchError: [PUT] "https://api-v2-staging.pandavideo.com/profile/a6a5f7ad-3eb9-4de6-b28a-9ac2b59de479": 400'

  const result = await enrichFetchErrorLog({
    message,
    tabId: 7,
    networkEntries: [
      {
        id: 'entry-1',
        url: 'https://api-v2-staging.pandavideo.com/profile/a6a5f7ad-3eb9-4de6-b28a-9ac2b59de479',
        method: 'PUT',
        status: 400,
        endedAt: Date.now(),
        networkTabId: 7,
        responseBodyLoaded: 'loaded',
        responseBody:
          '{"errCode":"BadRequest","errMsg":["controls must be a `array` type, but the final value was: `null`."]}',
      },
    ],
  })

  assert.equal(result?.relatedNetworkEntryId, 'entry-1')
  assert.equal(result?.responseErrorCode, 'BadRequest')
  assert.equal(
    result?.responseErrorDetails,
    'controls must be a `array` type, but the final value was: `null`.',
  )
  assert.match(result?.message || '', /BadRequest: controls must be a `array` type/)
})

test('can resolve the compat response body on demand before enriching the log', async () => {
  const message =
    'FetchError: [PUT] "https://api-v2-staging.pandavideo.com/profile/a6a5f7ad-3eb9-4de6-b28a-9ac2b59de479": 400'

  const result = await enrichFetchErrorLog({
    message,
    tabId: 7,
    networkEntries: [
      {
        id: 'entry-2',
        url: 'https://api-v2-staging.pandavideo.com/profile/a6a5f7ad-3eb9-4de6-b28a-9ac2b59de479',
        method: 'PUT',
        status: 400,
        endedAt: Date.now(),
        networkTabId: 7,
        source: 'compat',
        responseBodyLoaded: 'idle',
      },
    ],
    resolveResponseBody: async entry => {
      assert.equal(entry.id, 'entry-2')
      return {
        body: '{"errCode":"BadRequest","errMsg":["colors must be a object type, but the final value was: null."]}',
      }
    },
  })

  assert.equal(result?.responseErrorCode, 'BadRequest')
  assert.match(result?.message || '', /colors must be a object type/)
})
