import test from 'node:test'
import assert from 'node:assert/strict'

import { renderRulesQuickPanel } from '../src/sidepanel/components/rules-quick-panel.js'

test('rules quick panel keeps collection selector as a filter without collection toggle', () => {
  const html = renderRulesQuickPanel({
    settings: { activeCollectionId: 'collection-api' },
    collections: [
      { id: 'collection-api', name: 'API scenarios', enabled: true },
      { id: 'collection-auth', name: 'Auth scenarios', enabled: false }
    ],
    rules: [],
    rulesFilter: ''
  })

  assert.match(html, /id="active-collection-select"/)
  assert.match(html, /value="collection-api"/)
  assert.doesNotMatch(html, /value="collection-auth"/)
  assert.match(html, /id="manage-collections-btn"/)
  assert.match(html, /class="[^"]*\bdropdown-menu\b/)
  assert.match(html, /class="[^"]*\bdropdown-menu__item\b/)
  assert.doesNotMatch(html, /id="active-collection-enabled"/)
  assert.match(html, />Baixar template de coleção</)

  const copyCollectionIndex = html.indexOf('data-template-action="copy-collection"')
  const copyRuleIndex = html.indexOf('data-template-action="copy-rule"')
  const copyPromptIndex = html.indexOf('data-template-action="copy-ai-prompt"')
  const downloadCollectionIndex = html.indexOf('data-template-action="download-collection"')
  assert.ok(copyCollectionIndex < copyRuleIndex)
  assert.ok(copyRuleIndex < copyPromptIndex)
  assert.ok(copyPromptIndex < downloadCollectionIndex)
})

test('rules quick panel does not show stale matched state while capture is inactive', () => {
  const html = renderRulesQuickPanel({
    attachedTabId: null,
    compatActiveTabId: null,
    settings: { activeCollectionId: 'collection-api' },
    collections: [
      { id: 'collection-api', name: 'API scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-api', enabled: true, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: { lastMatchedAt: '2026-06-01T10:00:00.000Z' } }
    ],
    rulesFilter: ''
  })

  assert.doesNotMatch(html, /data-state="matched"/)
  assert.match(html, /data-state="ready"/)
})

test('rules quick panel keeps reset hit counts ready while capture is active', () => {
  const html = renderRulesQuickPanel({
    attachedTabId: null,
    compatActiveTabId: 123,
    settings: { activeCollectionId: 'collection-api' },
    collections: [
      { id: 'collection-api', name: 'API scenarios', enabled: true }
    ],
    rules: [
      { id: 'rule-a', name: 'Rule A', collectionId: 'collection-api', enabled: true, match: { method: 'GET', urlPattern: '/a' }, action: { type: 'mockResponse', statusCode: 200 }, diagnostics: { matchCount: 5, lastMatchedAt: null } }
    ],
    rulesFilter: ''
  })

  assert.match(html, />5</)
  assert.doesNotMatch(html, /data-state="matched"/)
  assert.match(html, /data-state="ready"/)
})
