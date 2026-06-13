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

test('sidepanel header uses compact capture mode badge with custom tooltip', () => {
  const html = renderConnectionHeader({ ...lightCaptureState, attachBusy: false })

  assert.match(html, /id="side-focus-tab-btn"[^>]*data-tooltip="https:\/\/example\.com\/app"/)
  assert.match(html, /id="side-capture-mode-settings"[^>]*data-tooltip=/)
  assert.match(html, /class="capture-mode-badge"/)
  assert.doesNotMatch(html, /Light capture · fetch \+ basic logs/)
  assert.doesNotMatch(html, /Captura leve · fetch \+ logs básicos/)
  assert.doesNotMatch(html, /Captura ligera · fetch \+ logs básicos/)
  assert.doesNotMatch(html, /id="side-focus-tab-btn"[^>]*title=/)
  assert.doesNotMatch(html, /id="side-capture-mode-settings"[^>]*title=/)
})

test('full app disabled start capture button explains why it is inactive', () => {
  const html = renderTopbar({
    attachedTab: null,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    settings: {}
  })

  assert.match(html, /class="btn-tooltip-wrapper"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /data-tooltip="Nenhuma aba capturável"/)
  assert.match(html, /<button[^>]*id="full-attach-btn"[^>]*disabled/)
})

test('sidepanel disabled start capture button explains why it is inactive', () => {
  const html = renderConnectionHeader({
    attachedTab: null,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    attachBusy: false,
    settings: {}
  })

  assert.match(html, /class="btn-tooltip-wrapper"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /data-tooltip="Nenhuma aba capturável"/)
  assert.match(html, /<button[^>]*id="attach-btn"[^>]*disabled/)
})

test('full app header keeps capture active when attached tab details are temporarily missing', () => {
  const html = renderTopbar({
    attachedTabId: 42,
    attachedTab: null,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    settings: {}
  })

  assert.match(html, /Captura ativa na aba \?/)
  assert.match(html, /id="full-detach-btn"[^>]*data-tab-id="42"/)
  assert.doesNotMatch(html, /id="full-attach-btn"[^>]*disabled[^>]*>.*Start capture/s)
})

test('sidepanel header keeps capture active when attached tab details are temporarily missing', () => {
  const html = renderConnectionHeader({
    attachedTabId: 42,
    attachedTab: null,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    attachBusy: false,
    settings: {}
  })

  assert.match(html, /Captura ativa na aba \?/)
  assert.match(html, /id="detach-btn"[^>]*data-tab-id="42"/)
  assert.doesNotMatch(html, /id="attach-btn"[^>]*disabled[^>]*>Start capture/)
})

test('full app header keeps light capture active when compat tab details are temporarily missing', () => {
  const html = renderTopbar({
    attachedTab: null,
    compatActiveTabId: 43,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    settings: { captureMode: 'compat' }
  })

  assert.match(html, /Captura ativa na aba \?/)
  assert.match(html, /id="full-detach-btn"[^>]*data-tab-id="43"/)
  assert.doesNotMatch(html, /id="full-attach-btn"[^>]*disabled[^>]*>.*Start capture/s)
})

test('sidepanel header keeps light capture active when compat tab details are temporarily missing', () => {
  const html = renderConnectionHeader({
    attachedTab: null,
    compatActiveTabId: 43,
    compatActiveTab: null,
    candidateTab: null,
    lastAttachableTab: null,
    attachBusy: false,
    settings: { captureMode: 'compat' }
  })

  assert.match(html, /Captura ativa na aba \?/)
  assert.match(html, /id="detach-btn"[^>]*data-tab-id="43"/)
  assert.doesNotMatch(html, /id="attach-btn"[^>]*disabled[^>]*>Start capture/)
})
