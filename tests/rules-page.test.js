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

test('rules page renders bulk selection controls', () => {
  const html = renderRulesPage({
    settings: { activeCollectionId: 'collection-enabled' },
    collections: [
      { id: 'collection-enabled', name: 'Enabled scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-enabled', enabled: true, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: {} },
      { id: 'rule-b', name: 'Rule B', collectionId: 'collection-enabled', enabled: true, match: { method: 'GET', urlPattern: '/b' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: {} }
    ],
    rulesSearch: ''
  })

  assert.match(html, /id="full-rules-select-all"/)
  assert.match(html, /class="ui-checkbox/)
  assert.match(html, /data-full-rule-select="rule-a"/)
  assert.match(html, /data-full-rule-select="rule-b"/)
  assert.doesNotMatch(html, /<button class="btn danger" id="full-delete-selected-rules-btn"/)
  assert.match(html, /id="full-rules-selection-bar"/)
  assert.match(html, /data-floating-selection-bar/)
  assert.match(html, /id="full-clear-selected-rules-btn"/)
  assert.match(html, /id="full-move-selected-rules-btn"/)
  assert.match(html, /id="full-delete-selected-rules-btn"/)
  assert.doesNotMatch(html, /data-full-rule-move=/)
})

test('rules page does not show stale matched state while capture is inactive', () => {
  const html = renderRulesPage({
    attachedTabId: null,
    compatActiveTabId: null,
    settings: { activeCollectionId: 'collection-enabled' },
    collections: [
      { id: 'collection-enabled', name: 'Enabled scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-enabled', enabled: true, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: { lastMatchedAt: '2026-06-01T10:00:00.000Z' } }
    ],
    rulesSearch: ''
  })

  assert.doesNotMatch(html, /data-state="matched"/)
  assert.match(html, /data-state="ready"/)
})

test('rules page keeps reset hit counts ready while capture is active', () => {
  const html = renderRulesPage({
    attachedTabId: null,
    compatActiveTabId: 123,
    settings: { activeCollectionId: 'collection-enabled' },
    collections: [
      { id: 'collection-enabled', name: 'Enabled scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-enabled', enabled: true, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: { matchCount: 5, lastMatchedAt: null } }
    ],
    rulesSearch: ''
  })

  assert.match(html, />5</)
  assert.match(html, /class="rule-hits-cell"[^>]*data-rule-hit="rule-a"[^>]*>5</)
  assert.doesNotMatch(html, /class="rule-hits-cell"[^>]*data-tooltip=/)
  assert.doesNotMatch(html, /data-state="matched"/)
  assert.match(html, /data-state="ready"/)
})

test('rules page state badges do not duplicate visible labels as tooltips', () => {
  const html = renderRulesPage({
    attachedTabId: null,
    compatActiveTabId: null,
    settings: { activeCollectionId: 'collection-enabled' },
    collections: [
      { id: 'collection-enabled', name: 'Enabled scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-enabled', enabled: false, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: {} }
    ],
    rulesSearch: ''
  })

  assert.match(html, /<span[^>]*class="rule-state-badge badge"[^>]*data-state="disabled"/)
  assert.match(html, />Desativada</)
  assert.doesNotMatch(html, /data-tooltip="Desativada"/)
})
