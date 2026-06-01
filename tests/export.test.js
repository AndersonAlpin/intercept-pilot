import test from 'node:test'
import assert from 'node:assert/strict'

import { createCollectionBundle, createRuleBundle } from '../src/shared/export.js'

const ruleWithRuntimeHits = {
  id: 'rule-runtime',
  name: 'Runtime hits rule',
  collectionId: 'collection-main',
  enabled: true,
  match: {
    method: 'GET',
    matchType: 'contains',
    urlPattern: '/roles',
    resourceType: 'Fetch'
  },
  action: {
    type: 'mockResponse',
    statusCode: 200
  },
  diagnostics: {
    matchCount: 3,
    lastMatchedAt: '2026-06-01T10:00:00.000Z',
    lastError: 'Previous failure'
  }
}

test('rule export omits runtime hit diagnostics', () => {
  const bundle = createRuleBundle(ruleWithRuntimeHits)

  assert.equal(bundle.rule.diagnostics.matchCount, undefined)
  assert.equal(bundle.rule.diagnostics.lastMatchedAt, undefined)
  assert.equal(bundle.rule.diagnostics.lastError, 'Previous failure')
})

test('collection export omits runtime hit diagnostics from rules', () => {
  const bundle = createCollectionBundle(
    { id: 'collection-main', name: 'Main' },
    [ruleWithRuntimeHits]
  )

  assert.equal(bundle.rules[0].diagnostics.matchCount, undefined)
  assert.equal(bundle.rules[0].diagnostics.lastMatchedAt, undefined)
  assert.equal(bundle.rules[0].diagnostics.lastError, 'Previous failure')
})
