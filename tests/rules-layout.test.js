import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync(new URL('../src/fullapp/fullapp.css', import.meta.url), 'utf8')

test('rules grid gives the rule name column extra room', () => {
  assert.match(
    css,
    /\.row-rule \{ grid-template-columns: 28px minmax\(200px, 1fr\) 54px 54px 92px 112px 56px 166px; \}/
  )
})

test('compact rules grid keeps row actions inside the visible panel', () => {
  assert.match(
    css,
    /\.row-rule \{ min-width: 856px; \}/
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
