import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const fullCss = readFileSync(new URL('../src/fullapp/fullapp.css', import.meta.url), 'utf8')
const sideCss = readFileSync(new URL('../src/sidepanel/sidepanel.css', import.meta.url), 'utf8')

test('full app and sidepanel toasts use a solid base surface', () => {
  for (const css of [fullCss, sideCss]) {
    assert.match(css, /\.toast \{[\s\S]*background: rgb\(11, 15, 23\);/)
    assert.match(css, /\.toast-success \{[\s\S]*background: linear-gradient\(180deg, rgba\(34, 197, 94, \.22\), rgba\(34, 197, 94, \.06\)\), rgb\(11, 15, 23\);/)
    assert.match(css, /\.toast-error \{[\s\S]*background: linear-gradient\(180deg, rgba\(255, 92, 102, \.24\), rgba\(255, 92, 102, \.07\)\), rgb\(11, 15, 23\);/)
    assert.match(css, /\.toast-info \{[\s\S]*background: linear-gradient\(180deg, rgba\(91, 130, 255, \.22\), rgba\(91, 130, 255, \.06\)\), rgb\(11, 15, 23\);/)
  }
})

test('full app table rows scroll separately from table headers without sticky positioning', () => {
  assert.doesNotMatch(fullCss, /\.data-panel__scroll \.rules-header \{[\s\S]*position: sticky;/)
  assert.match(fullCss, /\.data-panel__scroll--table \{[\s\S]*overflow: hidden;/)
  assert.match(fullCss, /\.data-table__rows \{[\s\S]*overflow: auto;[\s\S]*max-height: 100%;/)
})

test('full app table scrollbars add matching right padding to headers and rows', () => {
  assert.match(fullCss, /\.data-table\.is-scrollable-y \.data-table__header,[\s\S]*\.data-table\.is-scrollable-y \.data-table__rows \{[\s\S]*padding-right: 18px;/)
  assert.match(fullCss, /\.data-table\.is-scrollable-y \.data-table__rows \{[\s\S]*scrollbar-gutter: stable;/)
})
