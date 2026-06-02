import test from 'node:test'
import assert from 'node:assert/strict'

import { renderCollectionsPage } from '../src/fullapp/components/collections-page.js'

test('collections page hides default rename and uses custom action tooltips', () => {
  const html = renderCollectionsPage({
    settings: { activeCollectionId: 'collection-default' },
    collections: [
      { id: 'collection-default', name: 'Default', enabled: true },
      { id: 'collection-custom', name: 'Custom', enabled: true }
    ],
    rules: [
      { id: 'rule-enabled', collectionId: 'collection-custom', enabled: true },
      { id: 'rule-disabled', collectionId: 'collection-custom', enabled: false }
    ],
    collectionsSearch: ''
  })

  assert.doesNotMatch(html, /data-full-collection-rename="collection-default"/)
  assert.match(html, /data-full-collection-rename="collection-custom"/)
  assert.match(html, /data-tooltip=/)
  assert.doesNotMatch(html, /\stitle="/)
  assert.match(html, />Status</)
  assert.match(html, />Ativas</)
  assert.match(html, />1\/2</)
  assert.doesNotMatch(html, /Status da coleção/)
})

test('collections page renders bulk selection controls without allowing default deletion', () => {
  const html = renderCollectionsPage({
    settings: { activeCollectionId: 'collection-default' },
    collections: [
      { id: 'collection-default', name: 'Default', enabled: true },
      { id: 'collection-custom', name: 'Custom', enabled: true }
    ],
    rules: [],
    collectionsSearch: ''
  })

  assert.match(html, /id="full-collections-select-all"/)
  assert.match(html, /class="ui-checkbox/)
  assert.match(html, /data-full-collection-select="collection-custom"/)
  assert.match(html, /<input[^>]*disabled[^>]*data-full-collection-select="collection-default"/)
  assert.doesNotMatch(html, /<button class="btn danger" id="full-delete-selected-collections-btn"/)
  assert.match(html, /id="full-collections-selection-bar"/)
  assert.match(html, /data-floating-selection-bar/)
  assert.match(html, /id="full-clear-selected-collections-btn"/)
  assert.match(html, /id="full-delete-selected-collections-btn"/)
})
