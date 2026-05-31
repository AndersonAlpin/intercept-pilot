import test from 'node:test'
import assert from 'node:assert/strict'

import { renderNetworkPage } from '../src/fullapp/components/network-page.js'
import { renderNetworkQuickPanel } from '../src/sidepanel/components/network-quick-panel.js'

const failedEntry = {
  id: 'req-1',
  method: 'GET',
  url: 'https://jsonplaceholder.typicode.com/posts',
  status: 0,
  statusText: 'net::ERR_FAILED',
  resourceType: 'fetch'
}

test('network quick panel disables browser spellcheck for filters and labels failed requests', () => {
  const html = renderNetworkQuickPanel({
    visibleNetworkEntries: [failedEntry],
    filteredNetworkEntries: [failedEntry],
    pagedNetworkEntries: [failedEntry],
    networkPagination: { page: 1, pageSize: 50 },
    networkFilters: {
      text: 'jsonplaceholder.typicode',
      method: 'ANY',
      status: '',
      interceptedOnly: false
    },
    settings: {}
  })

  assert.match(html, /id="network-filter-text"[^>]*spellcheck="false"[^>]*autocomplete="off"/)
  assert.match(html, /id="network-filter-status"[^>]*spellcheck="false"[^>]*autocomplete="off"/)
  assert.match(html, />Falha</)
  assert.doesNotMatch(html, />0</)
})

test('full network page disables browser spellcheck for filters and labels failed requests', () => {
  const html = renderNetworkPage({
    visibleNetworkEntries: [failedEntry],
    filteredNetworkEntries: [failedEntry],
    pagedNetworkEntries: [failedEntry],
    networkEntries: [failedEntry],
    selectedNetworkEntryId: '',
    networkPagination: { page: 1, pageSize: 100 },
    networkFilter: {
      url: 'jsonplaceholder.typicode',
      method: 'ANY',
      status: '',
      interceptedOnly: false
    },
    settings: {}
  })

  assert.match(html, /id="full-network-url"[^>]*spellcheck="false"[^>]*autocomplete="off"/)
  assert.match(html, /id="full-network-status"[^>]*spellcheck="false"[^>]*autocomplete="off"/)
  assert.match(html, />Falha</)
  assert.doesNotMatch(html, />0</)
})
