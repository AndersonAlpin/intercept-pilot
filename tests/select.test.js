import test from 'node:test'
import assert from 'node:assert/strict'

import { renderSelect } from '../src/shared/ui/select.js'

test('select renders a custom menu backed by a native select value', () => {
  const html = renderSelect({
    id: 'status-filter',
    value: 'warn',
    options: [
      { value: 'ANY', label: 'All' },
      { value: 'warn', label: 'Warnings' }
    ],
    className: 'filter-small'
  })

  assert.match(html, /class="select-menu filter-small"/)
  assert.match(html, /<select class="select-menu__native" id="status-filter">/)
  assert.match(html, /<span class="select-menu__label">Warnings<\/span>/)
  assert.match(html, /data-select-button/)
  assert.match(html, /data-select-option="warn"/)
  assert.match(html, /aria-selected="true"/)
  assert.match(html, /class="select-menu__icon"/)
})
