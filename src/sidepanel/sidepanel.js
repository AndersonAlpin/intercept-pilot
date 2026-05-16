import { MSG, sendMessage } from '../shared/messaging.js'
import { makeRule } from '../shared/models.js'
import { setLocale, t } from '../shared/i18n.js'
import { renderConnectionHeader } from './components/connection-header.js'
import { renderCollectionSwitcher } from './components/collection-switcher.js'
import { renderTabs } from './components/tabs.js'
import { renderRulesQuickPanel, renderQuickRuleEditor } from './components/rules-quick-panel.js'
import { renderNetworkQuickPanel } from './components/network-quick-panel.js'
import { renderLogsQuickPanel } from './components/logs-quick-panel.js'

const appState = {
  currentTab: 'rules',
  collections: [],
  rules: [],
  logs: [],
  networkEntries: [],
  activeTab: null,
  attachedTabId: null,
  attachBusy: false,
  settings: { activeCollectionId: '' },

  rulesFilter: '',
  networkFilters: {
    text: '',
    method: 'ANY',
    status: '',
    matchedOnly: false,
    interceptedOnly: false
  },
  logsErrorOnly: false,

  quickRuleEditorOpen: false,
  quickRuleForm: makeRule({
    name: '',
    match: { urlPattern: '', matchType: 'contains', method: 'ANY', resourceType: 'ANY' },
    action: { type: 'mockResponse', statusCode: 200, delayMs: 0, responseBody: '{\n  "ok": true\n}' }
  })
}

function $(selector) {
  return document.querySelector(selector)
}

function activeCollectionId() {
  return appState.settings?.activeCollectionId || appState.collections[0]?.id || ''
}

function filteredNetworkEntries() {
  return appState.networkEntries.filter(entry => {
    const filter = appState.networkFilters
    if (filter.method !== 'ANY' && entry.method !== filter.method) return false
    if (filter.status && String(entry.status || '') !== filter.status) return false
    if (filter.matchedOnly && !entry.matchedRuleId) return false
    if (filter.interceptedOnly && !entry.intercepted) return false
    const text = filter.text.trim().toLowerCase()
    if (text) {
      const hay = `${entry.url} ${entry.method} ${entry.matchedRuleName || ''}`.toLowerCase()
      if (!hay.includes(text)) return false
    }
    return true
  })
}

function hydrateQuickRule(seed = {}) {
  const base = makeRule({
    collectionId: activeCollectionId(),
    name: '',
    match: { urlPattern: '', matchType: 'contains', method: 'ANY', resourceType: 'ANY' },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      statusText: 'OK',
      contentType: 'application/json',
      delayMs: 0,
      applyResponseBody: true,
      applyResponseHeaders: false,
      responseBody: '{\n  "ok": true\n}'
    }
  }, activeCollectionId())

  return {
    ...base,
    ...seed,
    match: { ...base.match, ...(seed.match || {}) },
    action: { ...base.action, ...(seed.action || {}) }
  }
}

function render() {
  const root = $('#app')
  const header = renderConnectionHeader(appState)
  const switcher = renderCollectionSwitcher(appState)
  const tabs = renderTabs(appState.currentTab)

  let body = ''
  if (appState.currentTab === 'rules') {
    body = `${renderRulesQuickPanel(appState)}${renderQuickRuleEditor(appState)}`
  }
  if (appState.currentTab === 'network') {
    appState.filteredNetworkEntries = filteredNetworkEntries()
    body = renderNetworkQuickPanel(appState)
  }
  if (appState.currentTab === 'logs') {
    body = renderLogsQuickPanel(appState)
  }

  root.innerHTML = `${header}${tabs}<section class="content">${switcher}${body}</section>`
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
  bindEvents()
}

function closeQuickEditor() {
  appState.quickRuleEditorOpen = false
  render()
}

async function refreshState() {
  const next = await sendMessage({ type: MSG.STATE_GET })
  if (next?.error) return
  Object.assign(appState, next)
  setLocale(appState.settings?.language || 'en')
  if (!appState.settings?.activeCollectionId) {
    appState.settings = { ...(appState.settings || {}), activeCollectionId: appState.collections[0]?.id || '' }
  }
  render()
}

function readQuickRuleForm() {
  const current = appState.quickRuleForm
  return {
    ...current,
    enabled: $('#quick-enabled')?.checked ?? true,
    name: $('#quick-name')?.value || current.name,
    collectionId: activeCollectionId(),
    match: {
      ...current.match,
      method: $('#quick-method')?.value || 'ANY',
      matchType: $('#quick-match-type')?.value || 'contains',
      urlPattern: $('#quick-url')?.value || ''
    },
    action: {
      ...current.action,
      type: $('#quick-action-type')?.value || 'mockResponse',
      statusCode: Number($('#quick-status')?.value || 200),
      delayMs: Number($('#quick-delay')?.value || 0),
      applyResponseBody: true,
      applyResponseHeaders: false,
      responseBody: $('#quick-body')?.value || '{\n  "ok": true\n}'
    }
  }
}

async function saveQuickRule(openAdvanced = false) {
  const payload = readQuickRuleForm()
  const type = payload.id ? MSG.RULES_UPDATE : MSG.RULES_CREATE
  const result = await sendMessage({ type, payload })
  if (result?.error) {
    alert(result.error || t('rules.saveError'))
    return
  }
  appState.quickRuleEditorOpen = false
  await refreshState()
  if (openAdvanced) await sendMessage({ type: MSG.APP_OPEN_FULL })
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      appState.currentTab = button.dataset.tab
      render()
    })
  })

  $('#open-fullapp-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))
  $('#manage-collections-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))
  $('#open-diagnostics-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))

  $('#attach-btn')?.addEventListener('click', async () => {
    appState.attachBusy = true
    render()
    await sendMessage({ type: MSG.DEBUG_ATTACH })
    appState.attachBusy = false
    await refreshState()
  })

  $('#detach-btn')?.addEventListener('click', async () => {
    appState.attachBusy = true
    render()
    await sendMessage({ type: MSG.DEBUG_DETACH })
    appState.attachBusy = false
    await refreshState()
  })

  $('#reload-tab-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.TAB_RELOAD }))

  $('#active-collection-select')?.addEventListener('change', async event => {
    const activeCollectionId = event.target.value
    appState.settings.activeCollectionId = activeCollectionId
    await sendMessage({ type: MSG.SETTINGS_UPDATE, payload: { activeCollectionId } })
    render()
  })

  $('#active-collection-enabled')?.addEventListener('change', async event => {
    const current = appState.collections.find(collection => collection.id === activeCollectionId())
    if (!current) return
    await sendMessage({ type: MSG.COLLECTIONS_UPDATE, payload: { ...current, enabled: event.target.checked } })
    await refreshState()
  })

  $('#rules-search')?.addEventListener('input', event => {
    appState.rulesFilter = event.target.value
    render()
  })

  $('#quick-new-rule-btn')?.addEventListener('click', () => {
    appState.quickRuleEditorOpen = true
    appState.quickRuleForm = hydrateQuickRule({ id: null, name: '', collectionId: activeCollectionId() })
    render()
  })

  $('#quick-editor-cancel')?.addEventListener('click', closeQuickEditor)
  $('#quick-editor-close-x')?.addEventListener('click', closeQuickEditor)
  document.querySelector('[data-modal-backdrop]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeQuickEditor()
  })

  $('#quick-save-rule')?.addEventListener('click', async () => saveQuickRule(false))
  $('#quick-open-advanced')?.addEventListener('click', async () => saveQuickRule(true))

  document.querySelectorAll('[data-rule-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleEdit)
      if (!rule) return
      appState.quickRuleEditorOpen = true
      appState.quickRuleForm = hydrateQuickRule(rule)
      render()
    })
  })

  document.querySelectorAll('[data-rule-toggle]').forEach(input => {
    input.addEventListener('change', async () => {
      await sendMessage({ type: MSG.RULES_TOGGLE, ruleId: input.dataset.ruleToggle, enabled: input.checked })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-rule-advanced]').forEach(button => {
    button.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL, editRuleId: button.dataset.ruleAdvanced }))
  })

  $('#network-refresh-btn')?.addEventListener('click', refreshState)
  $('#network-clear-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.NETWORK_CLEAR })
    await refreshState()
  })

  $('#network-filter-text')?.addEventListener('input', event => {
    appState.networkFilters.text = event.target.value
    render()
  })
  $('#network-filter-method')?.addEventListener('change', event => {
    appState.networkFilters.method = event.target.value
    render()
  })
  $('#network-filter-status')?.addEventListener('input', event => {
    appState.networkFilters.status = event.target.value
    render()
  })
  $('#network-filter-matched')?.addEventListener('change', event => {
    appState.networkFilters.matchedOnly = event.target.checked
    render()
  })
  $('#network-filter-intercepted')?.addEventListener('change', event => {
    appState.networkFilters.interceptedOnly = event.target.checked
    render()
  })

  document.querySelectorAll('[data-create-from-request]').forEach(button => {
    button.addEventListener('click', async () => {
      const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId: button.dataset.createFromRequest })
      if (result?.error) return alert(result.error || t('rules.createFromRequestError'))
      appState.currentTab = 'rules'
      if (result.createdRule) {
        appState.quickRuleEditorOpen = true
        appState.quickRuleForm = hydrateQuickRule(result.createdRule)
      }
      await refreshState()
    })
  })

  document.querySelectorAll('[data-open-inspect]').forEach(button => {
    button.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))
  })

  $('#logs-error-only')?.addEventListener('change', event => {
    appState.logsErrorOnly = event.target.checked
    render()
  })
  $('#logs-clear-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.LOGS_CLEAR })
    await refreshState()
  })
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state:network') {
    appState.networkEntries = message.networkEntries
    if (appState.currentTab === 'network') render()
  }
  if (message?.type === 'state:logs') {
    appState.logs = message.logs
    if (appState.currentTab === 'logs') render()
  }
  if (message?.type === 'state:attached') {
    appState.attachedTabId = message.attachedTabId
    render()
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  if (changes.settings || changes.collections || changes.rules) {
    refreshState()
  }
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && appState.quickRuleEditorOpen) closeQuickEditor()
})

refreshState()
