import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../src/sidepanel/sidepanel.css', import.meta.url), 'utf8')

test('sidepanel capture context stacks status, tab title and capture mode', () => {
  assert.match(css, /\.capture-context\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s)
  assert.match(css, /\.attach-status\s*\{[^}]*display:\s*flex;/s)
})

test('sidepanel keeps chrome fixed while only tab content lists scroll', () => {
  assert.match(css, /html,\s*body\s*\{[^}]*height:\s*100%;[^}]*overflow:\s*hidden;/s)
  assert.match(css, /#app\s*\{[^}]*height:\s*100vh;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*overflow:\s*hidden;/s)
  assert.match(css, /\.content\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*hidden;/s)
  assert.doesNotMatch(css, /\.sidepanel-top\s*\{[^}]*position:\s*sticky;/s)
  assert.doesNotMatch(css, /\.card\.sticky-filters \.sticky-bar\s*\{[^}]*position:\s*sticky;/s)
  assert.match(css, /\.card\.sticky-filters > \.list,\s*\.card\.sticky-filters > \.table\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-height:\s*0;[^}]*overflow:\s*auto;/s)
})

test('sidepanel rules panel lets header dropdowns escape without reopening full-card scroll', () => {
  assert.match(css, /\.card\.sticky-filters\.rules-panel\s*\{[^}]*overflow:\s*visible;/s)
  assert.match(css, /\.rules-panel > \.list\s*\{[^}]*overflow:\s*auto;/s)
})

test('sidepanel select menus leave space between hover targets', () => {
  assert.match(css, /\.select-menu__list\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;[^}]*gap:\s*4px;/s)
})

test('sidepanel rules footer preserves the visible lower card border', () => {
  assert.match(css, /\.rules-panel > \.sidepanel-list-footer\s*\{[^}]*border-radius:\s*0 0 11px 11px;[^}]*box-shadow:\s*inset 0 -1px 0 var\(--border\);/s)
})
