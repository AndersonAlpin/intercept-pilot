import test from 'node:test'
import assert from 'node:assert/strict'

import { renderTopbar } from '../src/fullapp/components/topbar.js'
import { renderConnectionHeader } from '../src/sidepanel/components/connection-header.js'

const lightCaptureState = {
  attachedTab: null,
  compatActiveTab: {
    id: 12,
    title: 'Example app',
    url: 'https://example.com/app',
    position: 1
  },
  compatActiveTabId: 12,
  candidateTab: {
    id: 12,
    title: 'Example app',
    url: 'https://example.com/app',
    position: 1
  },
  settings: {}
}

test('full app header uses custom tooltips for tab link and capture mode shortcut', () => {
  const html = renderTopbar(lightCaptureState)

  assert.match(html, /id="full-focus-tab-btn"[^>]*data-tooltip="https:\/\/example\.com\/app"/)
  assert.match(html, /id="full-capture-mode-settings"[^>]*data-tooltip=/)
  assert.doesNotMatch(html, /id="full-focus-tab-btn"[^>]*title=/)
  assert.doesNotMatch(html, /id="full-capture-mode-settings"[^>]*title=/)
})

test('sidepanel header uses custom tooltips for tab link and capture mode shortcut', () => {
  const html = renderConnectionHeader({ ...lightCaptureState, attachBusy: false })

  assert.match(html, /id="side-focus-tab-btn"[^>]*data-tooltip="https:\/\/example\.com\/app"/)
  assert.match(html, /id="side-capture-mode-settings"[^>]*data-tooltip=/)
  assert.doesNotMatch(html, /id="side-focus-tab-btn"[^>]*title=/)
  assert.doesNotMatch(html, /id="side-capture-mode-settings"[^>]*title=/)
})
