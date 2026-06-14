import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { renderCollectionsPage } from '../src/fullapp/components/collections-page.js'
import { renderLogsPage } from '../src/fullapp/components/logs-page.js'
import { renderNetworkPage } from '../src/fullapp/components/network-page.js'
import { renderRulesPage } from '../src/fullapp/components/rules-page.js'

function assertHeaderOutsideScrollableRows(html) {
  assert.match(html, /class="[^"]*\bdata-table__header\b/)
  assert.match(html, /class="[^"]*\bdata-table__rows\b/)
  const headerIndex = html.indexOf('data-table__header')
  const rowsIndex = html.indexOf('data-table__rows')
  assert.ok(headerIndex > -1)
  assert.ok(rowsIndex > -1)
  assert.ok(headerIndex < rowsIndex)
  assert.doesNotMatch(html.slice(rowsIndex), /\brules-header\b/)
}

test('full app rules table separates header from scrollable rows', () => {
  setLocale('en')
  const html = renderRulesPage({
    settings: { activeCollectionId: 'collection-default' },
    collections: [{ id: 'collection-default', name: 'Default', enabled: true }],
    rules: [{
      id: 'rule-1',
      name: 'Users',
      enabled: true,
      collectionId: 'collection-default',
      match: { method: 'GET', urlPattern: '/users' },
      action: { type: 'mockResponse', statusCode: 200 },
      diagnostics: {}
    }],
    rulesSearch: ''
  })

  assertHeaderOutsideScrollableRows(html)
})

test('full app network table separates header from scrollable rows', () => {
  setLocale('en')
  const entry = {
    id: 'req-1',
    method: 'GET',
    url: 'https://example.test/users',
    status: 200,
    resourceType: 'fetch'
  }
  const html = renderNetworkPage({
    visibleNetworkEntries: [entry],
    filteredNetworkEntries: [entry],
    pagedNetworkEntries: [entry],
    networkEntries: [entry],
    selectedNetworkEntryId: '',
    networkPagination: { page: 1, pageSize: 100 },
    networkFilter: { url: '', method: 'ANY', status: '', interceptedOnly: false },
    settings: {}
  })

  assertHeaderOutsideScrollableRows(html)
})

test('full app collections table separates header from scrollable rows', () => {
  setLocale('en')
  const html = renderCollectionsPage({
    settings: { activeCollectionId: 'collection-default' },
    collections: [{ id: 'collection-default', name: 'Default', enabled: true }],
    rules: [],
    collectionsSearch: ''
  })

  assertHeaderOutsideScrollableRows(html)
})

test('full app logs table separates header from scrollable rows', () => {
  setLocale('en')
  const log = {
    id: 'log-1',
    scope: 'web',
    level: 'info',
    message: 'Loaded',
    timestamp: '12:00',
    url: 'https://example.test'
  }
  const html = renderLogsPage({
    logs: [log],
    visibleLogs: [log],
    filteredLogs: [log],
    pagedLogs: [log],
    logsFilter: { level: 'ANY', search: '' },
    logsPagination: { page: 1, pageSize: 100 },
    settings: {}
  })

  assertHeaderOutsideScrollableRows(html)
})
