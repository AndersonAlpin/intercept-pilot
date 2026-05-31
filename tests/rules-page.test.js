import test from 'node:test'
import assert from 'node:assert/strict'

import { renderRulesPage } from '../src/fullapp/components/rules-page.js'

test('rules page filters out disabled collections from the collection selector', () => {
  const html = renderRulesPage({
    settings: { activeCollectionId: 'collection-disabled' },
    collections: [
      { id: 'collection-enabled', name: 'Enabled scenarios', enabled: true },
      { id: 'collection-disabled', name: 'Disabled scenarios', enabled: false }
    ],
    rules: [
      { id: 'rule-enabled', name: 'Enabled rule', collectionId: 'collection-enabled', enabled: true, match: { method: 'GET', urlPattern: '/enabled' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: {} },
      { id: 'rule-disabled', name: 'Disabled rule', collectionId: 'collection-disabled', enabled: true, match: { method: 'GET', urlPattern: '/disabled' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: {} }
    ],
    rulesSearch: ''
  })

  assert.match(html, /value="collection-enabled"/)
  assert.doesNotMatch(html, /value="collection-disabled"/)
  assert.match(html, /Enabled rule/)
  assert.doesNotMatch(html, /Disabled rule/)
})
