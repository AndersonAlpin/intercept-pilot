import test from 'node:test'
import assert from 'node:assert/strict'

import { renderNetworkPage } from '../src/fullapp/components/network-page.js'
import { setLocale } from '../src/shared/i18n.js'
import { matchesStatusFilter } from '../src/shared/network-display.js'
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

test('full network page uses compact localized resource type column labels', () => {
  const expectations = [
    { locale: 'pt-BR', label: 'Tipo', fullLabel: 'Tipo de recurso' },
    { locale: 'en', label: 'Type', fullLabel: 'Resource type' },
    { locale: 'es', label: 'Tipo', fullLabel: 'Tipo de recurso' }
  ]

  for (const { locale, label, fullLabel } of expectations) {
    setLocale(locale)

    const html = renderNetworkPage({
      visibleNetworkEntries: [failedEntry],
      filteredNetworkEntries: [failedEntry],
      pagedNetworkEntries: [failedEntry],
      networkEntries: [failedEntry],
      selectedNetworkEntryId: '',
      networkPagination: { page: 1, pageSize: 100 },
      networkFilter: {
        url: '',
        method: 'ANY',
        status: '',
        interceptedOnly: false
      },
      settings: {}
    })

    assert.match(html, new RegExp(`>${label}<`))
    assert.doesNotMatch(html, new RegExp(`>${fullLabel}<`))
    assert.doesNotMatch(html, />TYPE</)
  }
})

test('network status filter matches status prefixes', () => {
  assert.equal(matchesStatusFilter(200, '2'), true)
  assert.equal(matchesStatusFilter(204, '2'), true)
  assert.equal(matchesStatusFilter(404, '2'), false)
  assert.equal(matchesStatusFilter(0, '0'), true)
  assert.equal(matchesStatusFilter(200, ''), true)
})
