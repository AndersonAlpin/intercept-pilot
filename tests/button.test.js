import test from 'node:test'
import assert from 'node:assert/strict'

import { renderButton } from '../src/shared/ui/button.js'

test('button renders named icon on the left with stable label wrapper', () => {
  const html = renderButton({
    label: 'Arquivo JSON',
    iconName: 'upload',
    iconPosition: 'start'
  })

  assert.match(html, /class="[^"]*\bbtn\b/)
  assert.match(html, /class="btn__icon"/)
  assert.match(html, /class="btn__label">Arquivo JSON<\/span>/)
  assert.ok(html.indexOf('class="btn__icon"') < html.indexOf('class="btn__label"'))
})

test('button renders named icon on the right by default', () => {
  const html = renderButton({
    label: 'Templates',
    iconName: 'chevron-down'
  })

  assert.ok(html.indexOf('class="btn__label"') < html.indexOf('class="btn__icon"'))
})
