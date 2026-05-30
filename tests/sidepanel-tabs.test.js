import test from 'node:test'
import assert from 'node:assert/strict'

import { renderTabs } from '../src/sidepanel/components/tabs.js'

test('sidepanel navigation renders as semantic tabs', () => {
  const html = renderTabs('network')

  assert.match(html, /role="tablist"/)
  assert.match(html, /role="tab"/)
  assert.match(html, /aria-selected="true"[^>]*data-tab="network"/)
  assert.match(html, /aria-selected="false"[^>]*data-tab="rules"/)
})
