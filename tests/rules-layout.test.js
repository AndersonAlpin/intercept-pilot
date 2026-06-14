import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/fullapp/fullapp.css', import.meta.url), 'utf8')

test('rules grid gives the rule name column extra room', () => {
  assert.match(
    css,
    /\.row-rule \{ grid-template-columns: 28px minmax\(420px, 1fr\) 70px 70px 120px 150px 84px 190px; \}/
  )
  assert.match(
    css,
    /@media \(max-width: 1200px\) \{[\s\S]*\.row-rule \{ grid-template-columns: 28px minmax\(320px, 1fr\) 62px 62px 104px 126px 72px 174px; \}/
  )
})

test('rules row actions stay aligned to the right', () => {
  assert.match(css, /\.row-rule \.col-actions \{ justify-self: end; \}/)
  assert.match(css, /\.row-rule \.row-actions \{ justify-content: flex-end; overflow: visible; max-width: none; \}/)
})

test('rules hits stay visually closer to state than actions', () => {
  assert.match(css, /\.row-rule \.col-hits \{ justify-self: start; text-align: left; \}/)
  assert.match(css, /\.rules-header \.col-hits \{ text-align: left; \}/)
})
