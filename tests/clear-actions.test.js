import test from 'node:test'
import assert from 'node:assert/strict'

import { renderNetworkPage } from '../src/fullapp/components/network-page.js'
import { renderLogsPage } from '../src/fullapp/components/logs-page.js'
import { renderNetworkQuickPanel } from '../src/sidepanel/components/network-quick-panel.js'
import { renderLogsQuickPanel } from '../src/sidepanel/components/logs-quick-panel.js'

const networkEntry = {
  id: 'req-1',
  method: 'GET',
  url: 'https://example.com/api/users',
  status: 200,
  resourceType: 'Fetch'
}

const webLog = {
  id: 'log-1',
  level: 'info',
  scope: 'web',
  message: 'Loaded',
  timestamp: '2026-06-13T12:00:00.000Z',
  url: 'https://example.com'
}

function baseNetworkState(overrides = {}) {
  return {
    visibleNetworkEntries: [],
    filteredNetworkEntries: [],
    pagedNetworkEntries: [],
    networkEntries: [],
    selectedNetworkEntryId: '',
    networkPagination: { page: 1, pageSize: 100 },
    networkFilter: {
      url: '',
      method: 'ANY',
      status: '',
      interceptedOnly: false
    },
    networkFilters: {
      text: '',
      method: 'ANY',
      status: '',
      interceptedOnly: false
    },
    settings: {},
    ...overrides
  }
}

function baseLogsState(overrides = {}) {
  return {
    visibleLogs: [],
    filteredLogs: [],
    pagedLogs: [],
    logs: [],
    logsFilter: {
      level: 'ANY',
      search: ''
    },
    logsPagination: { page: 1, pageSize: 100 },
    settings: {},
    ...overrides
  }
}

test('network clear actions are disabled without active-context requests', () => {
  const fullHtml = renderNetworkPage(baseNetworkState())
  const sideHtml = renderNetworkQuickPanel(baseNetworkState())

  assert.match(fullHtml, /id="full-network-clear"[^>]*disabled/)
  assert.match(sideHtml, /id="network-clear-btn"[^>]*disabled/)
  assert.match(fullHtml, /data-tooltip="Não há requisições para limpar"/)
  assert.match(sideHtml, /data-tooltip="Não há requisições para limpar"/)
  assert.doesNotMatch(fullHtml, /data-tooltip="Não há requisições para limpar\."/)
  assert.doesNotMatch(sideHtml, /data-tooltip="Não há requisições para limpar\."/)
})

test('network clear actions stay enabled when filters hide active-context requests', () => {
  const state = baseNetworkState({
    visibleNetworkEntries: [networkEntry],
    filteredNetworkEntries: [],
    pagedNetworkEntries: []
  })

  const fullHtml = renderNetworkPage(state)
  const sideHtml = renderNetworkQuickPanel(state)

  assert.match(fullHtml, /id="full-network-clear"/)
  assert.doesNotMatch(fullHtml, /id="full-network-clear"[^>]*disabled/)
  assert.match(sideHtml, /id="network-clear-btn"/)
  assert.doesNotMatch(sideHtml, /id="network-clear-btn"[^>]*disabled/)
})

test('logs clear actions are disabled without active-context web logs', () => {
  const fullHtml = renderLogsPage(baseLogsState())
  const sideHtml = renderLogsQuickPanel(baseLogsState())

  assert.match(fullHtml, /id="full-clear-logs"[^>]*disabled/)
  assert.match(sideHtml, /id="logs-clear-btn"[^>]*disabled/)
  assert.match(fullHtml, /data-tooltip="Não há logs para limpar"/)
  assert.match(sideHtml, /data-tooltip="Não há logs para limpar"/)
  assert.doesNotMatch(fullHtml, /data-tooltip="Não há logs para limpar\."/)
  assert.doesNotMatch(sideHtml, /data-tooltip="Não há logs para limpar\."/)
})

test('logs clear actions stay enabled when filters hide active-context web logs', () => {
  const state = baseLogsState({
    visibleLogs: [webLog],
    filteredLogs: [],
    pagedLogs: []
  })

  const fullHtml = renderLogsPage(state)
  const sideHtml = renderLogsQuickPanel(state)

  assert.match(fullHtml, /id="full-clear-logs"/)
  assert.doesNotMatch(fullHtml, /id="full-clear-logs"[^>]*disabled/)
  assert.match(sideHtml, /id="logs-clear-btn"/)
  assert.doesNotMatch(sideHtml, /id="logs-clear-btn"[^>]*disabled/)
})
