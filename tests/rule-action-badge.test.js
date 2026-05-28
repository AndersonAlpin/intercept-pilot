import test from 'node:test'
import assert from 'node:assert/strict'

import { renderRuleActionBadge } from '../src/shared/ui/rule-status.js'

test('mock response badges vary by status code', () => {
  const okHtml = renderRuleActionBadge({
    actionType: 'mockResponse',
    label: 'mock 200',
    statusCode: 200
  })
  const clientErrorHtml = renderRuleActionBadge({
    actionType: 'mockResponse',
    label: 'mock 404',
    statusCode: 404
  })
  const serverErrorHtml = renderRuleActionBadge({
    actionType: 'mockResponse',
    label: 'mock 500',
    statusCode: 500
  })

  assert.match(okHtml, /class="badge success"/)
  assert.match(clientErrorHtml, /class="badge warning"/)
  assert.match(serverErrorHtml, /class="badge danger"/)
})

test('non-mock badges keep their action variant', () => {
  const failHtml = renderRuleActionBadge({
    actionType: 'failRequest',
    label: 'fail'
  })
  const delayHtml = renderRuleActionBadge({
    actionType: 'delayOnly',
    label: 'delay 200ms'
  })

  assert.match(failHtml, /class="badge danger"/)
  assert.match(delayHtml, /class="badge warning"/)
})
