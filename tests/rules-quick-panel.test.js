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
