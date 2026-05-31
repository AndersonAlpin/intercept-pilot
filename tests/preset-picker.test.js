import test from 'node:test'
import assert from 'node:assert/strict'

import { renderPresetPicker } from '../src/fullapp/components/preset-picker.js'

test('full preset picker uses visible labels without native title attributes', () => {
  const html = renderPresetPicker()

  assert.match(html, /preset-chip/)
  assert.doesNotMatch(html, /\stitle="/)
  assert.doesNotMatch(html, /data-tooltip=/)
})

test('compact preset picker uses custom tooltips instead of native title attributes', () => {
  const html = renderPresetPicker({ compact: true })

  assert.match(html, /preset-chip/)
  assert.match(html, /data-tooltip=/)
  assert.doesNotMatch(html, /\stitle="/)
})
