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

test('button wraps disabled controls with custom tooltip target', () => {
  const html = renderButton({
    id: 'clear-network',
    label: 'Limpar rede',
    disabled: true,
    tooltip: 'Não há requisições para limpar'
  })

  assert.match(html, /class="btn-tooltip-wrapper"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /data-tooltip="Não há requisições para limpar"/)
  assert.match(html, /<button[^>]*id="clear-network"[^>]*disabled/)
})
