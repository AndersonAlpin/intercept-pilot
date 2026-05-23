import { MSG, sendMessage } from '../shared/messaging.js'
import { makeRule } from '../shared/models.js'
import { validateRule } from '../shared/validators.js'
import { setLocale, t } from '../shared/i18n.js'
import { DEFAULT_NETWORK_FILTER_SIDE } from '../shared/constants.js'
import { debounce, isHitOnlyDiff, isOnlyNetworkFiltersDiff, matchesNetworkIgnorePatterns } from '../shared/utils.js'
import { getPresetById, applyPresetToRule } from '../shared/presets.js'
import {
  createRuleBundle,
  copyJsonToClipboard,
  downloadJsonFile,
  buildRuleFilename
} from '../shared/export.js'
import { toastSuccess, toastError } from '../shared/toast.js'
import { confirmDialog } from '../shared/dialogs.js'
import { renderConnectionHeader } from './components/connection-header.js'
import { renderCollectionSwitcher } from './components/collection-switcher.js'
import { renderTabs } from './components/tabs.js'
import { renderRulesQuickPanel, renderQuickRuleEditor } from './components/rules-quick-panel.js'
import { renderNetworkQuickCount, renderNetworkQuickPagination, renderNetworkQuickPanel, renderNetworkQuickRows } from './components/network-quick-panel.js'
import { renderLogsQuickPanel } from './components/logs-quick-panel.js'

const appState = {
  currentTab: 'rules',
  collections: [],
  rules: [],
  logs: [],
  networkEntries: [],
  activeTab: null,
  attachedTab: null,
  compatActiveTab: null,
  candidateTab: null,
  lastAttachableTab: null,
  attachedTabId: null,
  compatActiveTabId: null,
  attachBusy: false,
  settings: { activeCollectionId: '' },

  rulesFilter: '',
  networkFilters: {
    text: '',
    method: 'ANY',
    status: '',
    interceptedOnly: false
  },
  networkPagination: {
    page: 1,
    pageSize: 50
  },
  networkFiltersHydrated: false,
  logsErrorOnly: false,

  quickRuleEditorOpen: false,
  editorMode: 'create',
  editorPristine: true,
  quickRuleForm: makeRule({
    name: '',
    match: { urlPattern: '', matchType: 'contains', method: 'ANY', resourceType: 'ANY' },
    action: { type: 'mockResponse', statusCode: 200, delayMs: 0, responseBody: '{\n  "ok": true\n}' }
  })
}

function $(selector) {
  return document.querySelector(selector)
}

function captureFocusSnapshot() {
  const active = document.activeElement
  if (!active || !(active instanceof HTMLElement) || !active.id) return null
  if (!(active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement)) return null
  return {
    id: active.id,
    selectionStart: typeof active.selectionStart === 'number' ? active.selectionStart : null,
    selectionEnd: typeof active.selectionEnd === 'number' ? active.selectionEnd : null
  }
}

function restoreFocusSnapshot(snapshot) {
  if (!snapshot?.id) return
  const el = document.getElementById(snapshot.id)
  if (!el || !(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return
  el.focus({ preventScroll: true })
  if (typeof snapshot.selectionStart === 'number' && typeof snapshot.selectionEnd === 'number') {
    try {
      el.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd)
    } catch {}
  }
}

function activeCollectionId() {
  return appState.settings?.activeCollectionId || appState.collections[0]?.id || ''
}

function isRenderableNetworkEntry(entry) {
  const method = String(entry?.method || '').trim()
  const url = String(entry?.url || '').trim()
  return Boolean(method || url)
}

function filteredNetworkEntries() {
  return appState.networkEntries.filter(entry => {
    if (!isRenderableNetworkEntry(entry)) return false
    const filter = appState.networkFilters
    if (filter.method !== 'ANY' && entry.method !== filter.method) return false
    if (filter.status && String(entry.status || '') !== filter.status) return false
    if (filter.interceptedOnly && !entry.intercepted) return false
    if (matchesNetworkIgnorePatterns(entry.url, appState.settings?.networkIgnorePatterns || [])) return false
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

function filteredLogs() {
  return appState.logs.filter(log => {
    if (appState.logsErrorOnly && log.level !== 'error') return false
    if (String(log.scope || '').toLowerCase() !== 'web') return false
    return true
  })
}

function applyNetworkFilters() {
  appState.filteredNetworkEntries = filteredNetworkEntries()
  applyNetworkPagination()
}

function applyNetworkPagination() {
  const pagination = appState.networkPagination || { page: 1, pageSize: 50 }
  const pageSize = Math.max(1, Number(pagination.pageSize || 50))
  const total = appState.filteredNetworkEntries.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Number(pagination.page || 1)), totalPages)
  appState.networkPagination = { page, pageSize }
  const start = (page - 1) * pageSize
  appState.pagedNetworkEntries = appState.filteredNetworkEntries.slice(start, start + pageSize)
}

function resetNetworkPage() {
  appState.networkPagination = { ...(appState.networkPagination || {}), page: 1 }
}

function bindNetworkRowEvents() {
  const table = $('#network-entries-table')
  if (!table || table.dataset.bound === 'true') return
  table.dataset.bound = 'true'
  table.addEventListener('click', async event => {
    const target = event.target instanceof Element ? event.target : null
    if (!target) return

    const createButton = target.closest('[data-create-from-request]')
    if (createButton && table.contains(createButton)) {
      const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId: createButton.dataset.createFromRequest })
      if (result?.error) return toastError(result.error || t('rules.createFromRequestError'))
      appState.currentTab = 'rules'
      if (result.createdRule) {
        appState.quickRuleEditorOpen = true
        appState.quickRuleForm = hydrateQuickRule(result.createdRule)
      }
      await refreshState()
      return
    }

    const inspectButton = target.closest('[data-open-inspect]')
    if (inspectButton && table.contains(inspectButton)) {
      const entryId = inspectButton.dataset.openInspect
      const url = chrome.runtime.getURL(`src/fullapp/fullapp.html?page=network&inspect=${encodeURIComponent(entryId)}`)
      chrome.tabs.create({ url })
    }
  })
}

function bindNetworkPaginationEvents() {
  const container = $('#network-pagination-controls')
  if (!container || container.dataset.bound === 'true') return
  container.dataset.bound = 'true'
  container.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null
    const button = target?.closest('[data-side-network-page]')
    if (!button || !container.contains(button)) return
    const direction = button.dataset.sideNetworkPage
    const current = Number(appState.networkPagination?.page || 1)
    appState.networkPagination = {
      ...(appState.networkPagination || {}),
      page: direction === 'next' ? current + 1 : current - 1
    }
    refreshSideNetworkOnly()
  })
}

function refreshSideNetworkOnly() {
  if (appState.currentTab !== 'network') return
  const table = $('#network-entries-table')
  if (!table) {
    render()
    return
  }
  applyNetworkFilters()
  table.innerHTML = renderNetworkQuickRows(appState)
  const countEl = $('#network-results-count')
  if (countEl) countEl.textContent = renderNetworkQuickCount(appState)
  const paginationEl = $('#network-pagination-controls')
  if (paginationEl) paginationEl.innerHTML = renderNetworkQuickPagination(appState)
  bindNetworkRowEvents()
  bindNetworkPaginationEvents()
}

function render() {
  const root = $('#app')
  const focusSnapshot = captureFocusSnapshot()
  const header = renderConnectionHeader(appState)
  const tabs = renderTabs(appState.currentTab)

  let body = ''
  if (appState.currentTab === 'rules') {
    body = `${renderCollectionSwitcher(appState)}${renderRulesQuickPanel(appState)}${renderQuickRuleEditor(appState)}`
  }
  if (appState.currentTab === 'network') {
    applyNetworkFilters()
    body = renderNetworkQuickPanel(appState)
  }
  if (appState.currentTab === 'logs') {
    appState.filteredLogs = filteredLogs()
    body = renderLogsQuickPanel(appState)
  }

  root.innerHTML = `${header}${tabs}<section class="content">${body}</section>`
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
  updateHeaderOffset()
  bindEvents()
  restoreFocusSnapshot(focusSnapshot)
}

function bindHeaderEvents() {
  const startOrRestartCapture = async button => {
    appState.attachBusy = true
    refreshHeaderOnly()
    const buttonTabId = Number(button?.dataset.tabId || 0) || null
    const preferredTabId = buttonTabId || appState.compatActiveTab?.id || appState.attachedTab?.id || appState.candidateTab?.id || appState.lastAttachableTab?.id || null
    const result = await sendMessage({
      type: MSG.DEBUG_ATTACH,
      tabId: preferredTabId
    })
    appState.attachBusy = false
    if (result?.error) {
      toastError(translateBackendError(result.error), backendErrorDuration(result.error))
      refreshHeaderOnly()
      return
    }
    await refreshState()
  }

  $('#open-fullapp-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))
  $('#side-open-auto-attach-settings')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL, page: 'settings' }))
  $('#side-capture-mode-settings')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL, page: 'settings' }))
  $('#attach-btn')?.addEventListener('click', event => startOrRestartCapture(event.currentTarget))
  $('#attach-new-tab-btn')?.addEventListener('click', event => startOrRestartCapture(event.currentTarget))
  $('#detach-btn')?.addEventListener('click', async () => {
    const button = $('#detach-btn')
    appState.attachBusy = true
    refreshHeaderOnly()
    const targetTabId = Number(button?.dataset.tabId || 0) || appState.compatActiveTab?.id || appState.attachedTab?.id || null
    await sendMessage({ type: MSG.DEBUG_DETACH, tabId: targetTabId })
    appState.attachBusy = false
    await refreshState()
  })
  $('#reload-tab-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.TAB_RELOAD })
    if (result?.error) toastError(translateBackendError(result.error))
  })
  $('#side-focus-tab-btn')?.addEventListener('click', async () => {
    const targetTabId = appState.attachedTab?.id || appState.compatActiveTab?.id || appState.candidateTab?.id || appState.lastAttachableTab?.id || null
    if (!targetTabId) return
    await chrome.tabs.update(targetTabId, { active: true }).catch(() => {})
    const tab = await chrome.tabs.get(targetTabId).catch(() => null)
    if (tab?.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {})
    }
  })
}

function refreshHeaderOnly() {
  const headerEl = document.querySelector('.header')
  if (!headerEl) {
    render()
    return
  }
  const focusSnapshot = captureFocusSnapshot()
  headerEl.outerHTML = renderConnectionHeader(appState)
  updateHeaderOffset()
  bindHeaderEvents()
  restoreFocusSnapshot(focusSnapshot)
}

function sameTabRef(a, b) {
  const left = a || null
  const right = b || null
  return (left?.id ?? null) === (right?.id ?? null)
    && (left?.url ?? null) === (right?.url ?? null)
    && (left?.title ?? null) === (right?.title ?? null)
    && (left?.index ?? null) === (right?.index ?? null)
}

function connectionChanged(current, next) {
  return (current.attachedTabId ?? null) !== (next.attachedTabId ?? null)
    || !sameTabRef(current.attachedTab, next.attachedTab)
    || !sameTabRef(current.compatActiveTab, next.compatActiveTab)
    || !sameTabRef(current.activeTab, next.activeTab)
    || !sameTabRef(current.candidateTab, next.candidateTab)
    || !sameTabRef(current.lastAttachableTab, next.lastAttachableTab)
    || (current.compatActiveTabId ?? null) !== (next.compatActiveTabId ?? null)
}

let pendingConnectionPatch = null
const flushConnectionUpdate = debounce(() => {
  if (!pendingConnectionPatch) return
  const patch = pendingConnectionPatch
  pendingConnectionPatch = null

  const current = {
    attachedTabId: appState.attachedTabId ?? null,
    attachedTab: appState.attachedTab ?? null,
    compatActiveTab: appState.compatActiveTab ?? null,
    activeTab: appState.activeTab ?? null,
    candidateTab: appState.candidateTab ?? null,
    lastAttachableTab: appState.lastAttachableTab ?? null,
    compatActiveTabId: appState.compatActiveTabId ?? null
  }
  const next = {
    attachedTabId: patch.attachedTabId ?? current.attachedTabId,
    attachedTab: patch.attachedTab ?? current.attachedTab,
    compatActiveTab: patch.compatActiveTab ?? current.compatActiveTab,
    activeTab: patch.activeTab ?? current.activeTab,
    candidateTab: patch.candidateTab ?? current.candidateTab,
    lastAttachableTab: patch.lastAttachableTab ?? current.lastAttachableTab,
    compatActiveTabId: patch.compatActiveTabId ?? current.compatActiveTabId
  }

  const changed = connectionChanged(current, next)
  appState.attachedTabId = next.attachedTabId
  appState.attachedTab = next.attachedTab
  appState.compatActiveTab = next.compatActiveTab
  appState.activeTab = next.activeTab
  appState.candidateTab = next.candidateTab
  appState.lastAttachableTab = next.lastAttachableTab
  appState.compatActiveTabId = next.compatActiveTabId

  if (!changed) return
  refreshHeaderOnly()
}, 120)

function queueConnectionPatch(patch) {
  pendingConnectionPatch = { ...(pendingConnectionPatch || {}), ...patch }
  flushConnectionUpdate()
}

function updateHeaderOffset() {
  const headerEl = document.querySelector('.header')
  if (!headerEl) return
  const height = headerEl.offsetHeight
  document.documentElement.style.setProperty('--sp-header-h', `${height}px`)
}

function closeQuickEditor() {
  appState.quickRuleEditorOpen = false
  appState.editorMode = 'create'
  appState.editorPristine = true
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
  if (!appState.networkFiltersHydrated) {
    appState.networkFilters = {
      ...DEFAULT_NETWORK_FILTER_SIDE,
      ...(appState.settings?.networkFilters?.sidepanel || {})
    }
    appState.networkFiltersHydrated = true
  }
  render()
}

const persistSidepanelNetworkFilter = debounce(async () => {
  await sendMessage({
    type: MSG.SETTINGS_UPDATE,
    payload: {
      networkFilters: {
        ...(appState.settings.networkFilters || {}),
        sidepanel: { ...appState.networkFilters }
      }
    }
  })
}, 300)

async function applyPresetSidepanel(presetId) {
  const preset = getPresetById(presetId)
  if (!preset || !appState.quickRuleForm) return
  const needsConfirm = appState.editorMode === 'edit' || !appState.editorPristine
  if (needsConfirm) {
    const ok = await confirmDialog({
      title: t('presets.applyTitle'),
      message: t('presets.applyConfirm', { preset: t(preset.labelKey) }),
      confirmLabel: t('presets.applyConfirmBtn'),
      cancelLabel: t('common.cancel')
    })
    if (!ok) return
  }
  appState.quickRuleForm = applyPresetToRule(appState.quickRuleForm, preset)
  appState.editorPristine = false
  toastSuccess(t('toasts.presetApplied', { preset: t(preset.labelKey) }))
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

function translateBackendError(code) {
  if (!code) return t('rules.saveError')
  if (typeof code === 'string' && (code === 'attachCrossExtension' || code.startsWith('attachCrossExtension:'))) {
    return t('errors.attachCrossExtension', { ids: parseCrossExtensionLabels(code) })
  }
  const key = `errors.${code}`
  const value = t(key)
  return value === key ? code : value
}

function backendErrorDuration(code) {
  if (typeof code !== 'string') return undefined
  if (code === 'attachCrossExtension' || code.startsWith('attachCrossExtension:')) return 5000
  if (code === 'attachDebuggerBusy') return 6000
  return undefined
}

function parseCrossExtensionLabels(code) {
  if (!code.startsWith('attachCrossExtension:')) return 'unknown'
  const suffix = code.slice('attachCrossExtension:'.length)
  try {
    const parsed = JSON.parse(suffix)
    if (Array.isArray(parsed) && parsed.length) return parsed.map(String).join(', ')
  } catch {
    const list = suffix.split(',').filter(Boolean)
    if (list.length) return list.join(', ')
  }
  return 'unknown'
}

async function saveQuickRule() {
  const payload = readQuickRuleForm()
  const errors = validateRule(payload)
  if (errors.length) {
    toastError(t(`errors.${errors[0]}`))
    return
  }
  const type = payload.id ? MSG.RULES_UPDATE : MSG.RULES_CREATE
  const result = await sendMessage({ type, payload })
  if (result?.error) {
    toastError(translateBackendError(result.error))
    return
  }
  appState.quickRuleEditorOpen = false
  toastSuccess(t('rules.saveSuccess'))
  await refreshState()
}

async function openAdvancedFromQuick() {
  const draftRule = readQuickRuleForm()
  appState.quickRuleEditorOpen = false
  render()
  await sendMessage({ type: MSG.APP_OPEN_FULL, draftRule: JSON.stringify(draftRule) })
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      appState.currentTab = button.dataset.tab
      render()
    })
  })

  bindHeaderEvents()
  $('#manage-collections-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))
  $('#open-diagnostics-btn')?.addEventListener('click', async () => sendMessage({ type: MSG.APP_OPEN_FULL }))

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
    appState.editorMode = 'create'
    appState.editorPristine = true
    render()
  })

  $('#quick-editor-cancel')?.addEventListener('click', closeQuickEditor)
  $('#quick-editor-close-x')?.addEventListener('click', closeQuickEditor)
  document.querySelector('[data-modal-backdrop]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeQuickEditor()
  })

  $('#quick-save-rule')?.addEventListener('click', saveQuickRule)
  $('#quick-open-advanced')?.addEventListener('click', openAdvancedFromQuick)
  $('#quick-open-advanced-hint')?.addEventListener('click', openAdvancedFromQuick)

  document.querySelectorAll('[data-rule-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleEdit)
      if (!rule) return
      appState.quickRuleEditorOpen = true
      appState.quickRuleForm = hydrateQuickRule(rule)
      appState.editorMode = 'edit'
      appState.editorPristine = false
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

  document.querySelectorAll('[data-rule-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleCopy)
      if (!rule) return
      try {
        await copyJsonToClipboard(createRuleBundle(rule))
        toastSuccess(t('toasts.ruleCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })

  document.querySelectorAll('[data-rule-export]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleExport)
      if (!rule) return
      try {
        downloadJsonFile(createRuleBundle(rule), buildRuleFilename(rule))
        toastSuccess(t('toasts.ruleExported'))
      } catch {
        toastError(t('toasts.exportError'))
      }
    })
  })

  document.querySelectorAll('[data-rule-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t('rules.deleteTitle'),
        message: t('rules.deleteConfirm'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true
      })
      if (!ok) return
      await sendMessage({ type: MSG.RULES_DELETE, ruleId: button.dataset.ruleDelete })
      toastSuccess(t('rules.deleteSuccess'))
      await refreshState()
    })
  })

  $('#network-refresh-btn')?.addEventListener('click', refreshState)
  $('#network-clear-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.NETWORK_CLEAR })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    appState.networkEntries = result?.networkEntries || []
    resetNetworkPage()
    refreshSideNetworkOnly()
  })

  $('#network-filter-text')?.addEventListener('input', event => {
    appState.networkFilters.text = event.target.value
    resetNetworkPage()
    persistSidepanelNetworkFilter()
    refreshSideNetworkOnly()
  })
  $('#network-filter-method')?.addEventListener('change', event => {
    appState.networkFilters.method = event.target.value
    resetNetworkPage()
    persistSidepanelNetworkFilter()
    refreshSideNetworkOnly()
  })
  $('#network-filter-status')?.addEventListener('input', event => {
    appState.networkFilters.status = event.target.value
    resetNetworkPage()
    persistSidepanelNetworkFilter()
    refreshSideNetworkOnly()
  })
  $('#network-filter-intercepted')?.addEventListener('change', event => {
    appState.networkFilters.interceptedOnly = event.target.checked
    resetNetworkPage()
    persistSidepanelNetworkFilter()
    refreshSideNetworkOnly()
  })

  document.querySelectorAll('[data-preset-apply]').forEach(btn => {
    btn.addEventListener('click', () => applyPresetSidepanel(btn.dataset.presetApply))
  })

  const quickBackdrop = document.querySelector('.modal-backdrop')
  if (quickBackdrop && appState.quickRuleEditorOpen) {
    const markDirty = () => { appState.editorPristine = false }
    quickBackdrop.addEventListener('input', markDirty)
    quickBackdrop.addEventListener('change', markDirty)
  }

  bindNetworkRowEvents()
  bindNetworkPaginationEvents()

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
    if (appState.currentTab === 'network') refreshSideNetworkOnly()
  }
  if (message?.type === 'state:logs') {
    appState.logs = message.logs
    if (appState.currentTab === 'logs') render()
  }
  if (message?.type === 'state:attached') {
    queueConnectionPatch({ attachedTabId: message.attachedTabId ?? null })
  }
  if (message?.type === 'state:connection') {
    queueConnectionPatch({
      attachedTabId: message.attachedTabId ?? null,
      attachedTab: message.attachedTab ?? null,
      compatActiveTab: message.compatActiveTab ?? null,
      activeTab: message.activeTab ?? null,
      candidateTab: message.candidateTab ?? null,
      lastAttachableTab: message.lastAttachableTab ?? null,
      compatActiveTabId: message.compatActiveTabId ?? null
    })
  }
  if (message?.type === 'state:activeTab') {
    queueConnectionPatch({ activeTab: message.activeTab ?? null })
  }
  if (message?.type === 'state:hit') {
    const rule = appState.rules.find(r => r.id === message.ruleId)
    if (rule) {
      rule.diagnostics = rule.diagnostics || {}
      rule.diagnostics.matchCount = message.matchCount
      rule.diagnostics.lastMatchedAt = message.lastMatchedAt
    }
    const hitEl = document.querySelector(`[data-rule-hit="${message.ruleId}"]`)
    if (hitEl) hitEl.textContent = String(message.matchCount)
    const stateEl = document.querySelector(`[data-rule-state="${message.ruleId}"]`)
    if (stateEl) {
      const stateLabel = t('rules.states.matched')
      stateEl.setAttribute('data-state', 'matched')
      stateEl.setAttribute('title', stateLabel)
      stateEl.setAttribute('aria-label', stateLabel)
    }
  }
  if (message?.type === 'state:hit-reset') {
    for (const rule of appState.rules) {
      if (rule?.diagnostics) rule.diagnostics.lastMatchedAt = null
    }
    render()
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  if (changes.settings) {
    if (isOnlyNetworkFiltersDiff(changes.settings.oldValue, changes.settings.newValue)) {
      return
    }
  }
  if (changes.rules) {
    if (isHitOnlyDiff(changes.rules.oldValue, changes.rules.newValue)) {
      return
    }
  }
  if (changes.settings || changes.collections || changes.rules) {
    refreshState()
  }
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && appState.quickRuleEditorOpen) closeQuickEditor()
})

window.addEventListener('resize', updateHeaderOffset)

refreshState()
