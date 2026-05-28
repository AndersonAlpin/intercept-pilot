import test from 'node:test'
import assert from 'node:assert/strict'

import { getTooltipAttrs, renderTooltipAttrs } from '../src/shared/ui/tooltip.js'

test('tooltip attrs support an optional delay', () => {
  assert.deepEqual(getTooltipAttrs('Rule name', { delayMs: 240 }), {
    'data-tooltip': 'Rule name',
    'data-tooltip-delay': '240'
  })
  assert.match(renderTooltipAttrs('Rule name', { delayMs: 240 }), /data-tooltip-delay="240"/)
})

test('tooltip attrs stay immediate by default', () => {
  assert.deepEqual(getTooltipAttrs('Edit'), {
    'data-tooltip': 'Edit'
  })
  assert.equal(renderTooltipAttrs('Edit').includes('data-tooltip-delay'), false)
})
