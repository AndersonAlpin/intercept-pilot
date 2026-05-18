import { MSG, sendMessage } from '../shared/messaging.js'
import { clone, debounce, isHitOnlyDiff, isOnlyNetworkFiltersDiff } from '../shared/utils.js'
import { makeCollection, makeRule } from '../shared/models.js'
import { validateRule } from '../shared/validators.js'
import { setLocale, t } from '../shared/i18n.js'
import { DEFAULT_NETWORK_FILTER_FULL } from '../shared/constants.js'
import {
  createRuleBundle,
  createCollectionBundle,
  copyJsonToClipboard,
  copyTextToClipboard,
  downloadJsonFile,
  getUniqueName,
  buildRuleFilename,
  buildCollectionFilename,
  SCHEMA_VERSION,
  BUNDLE_TYPE_RULE,
  BUNDLE_TYPE_COLLECTION
} from '../shared/export.js'
import { toastSuccess, toastError } from '../shared/toast.js'
import { confirmDialog, promptDialog } from '../shared/dialogs.js'
import { getPresetById, applyPresetToRule } from '../shared/presets.js'
import { entryToCurl, entryToFetch } from '../shared/network-format.js'
import { renderAppShell } from './components/app-shell.js'
import { renderSidebar } from './components/sidebar.js'
import { renderTopbar } from './components/topbar.js'
import { renderDashboardPage } from './components/dashboard-page.js'
import { renderRulesPage } from './components/rules-page.js'
import { renderRuleEditor } from './components/rule-editor.js'
import { renderCollectionsPage } from './components/collections-page.js'
import { renderNetworkPage, renderNetworkRows, isRenderableNetworkEntry } from './components/network-page.js'
import { renderLogsPage } from './components/logs-page.js'
import { renderImportExportPage } from './components/import-export-page.js'
import { renderDiagnosticsPage } from './components/diagnostics-page.js'
import { renderNetworkInspectorModal, renderInspectorBody, expectsNoBody } from './components/network-inspector-modal.js'

const state = {
  page: 'dashboard',
  collections: [],
  rules: [],
  logs: [],
  networkEntries: [],
  activeTab: null,
  attachedTab: null,
  candidateTab: null,
  lastAttachableTab: null,
  attachedTabId: null,
  settings: {},

  editingRule: null,
  editorMode: 'create',
  editorPristine: true,
  rulesSearch: '',
  collectionsSearch: '',
  networkFilter: {
    url: '',
    method: 'ANY',
    status: '',
    interceptedOnly: false
  },
  logsFilter: {
    level: 'ANY',
    search: ''
  },
  filteredNetworkEntries: [],
  filteredLogs: [],
  lastImportExportMessage: '',
  inspector: null,
  selectedNetworkEntryId: null,
  networkFilterHydrated: false
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

function normalizeLogScope(scope) {
  return String(scope || '').toLowerCase() === 'web' ? 'web' : 'app'
}

async function refreshState() {
  const next = await sendMessage({ type: MSG.STATE_GET })
  if (next?.error) return
  Object.assign(state, next)
  setLocale(state.settings?.language || 'en')
  if (state.editingRule) {
    state.editingRule = state.rules.find(rule => rule.id === state.editingRule.id) || null
  }
  if (!state.networkFilterHydrated) {
    hydrateNetworkFilterFromSettings()
    state.networkFilterHydrated = true
  }
  applyLocalFilters()
  render()
}

function applyLocalFilters() {
  state.filteredNetworkEntries = state.networkEntries.filter(entry => {
    if (!isRenderableNetworkEntry(entry)) return false
    const f = state.networkFilter
    if (f.method !== 'ANY' && entry.method !== f.method) return false
    if (f.status && String(entry.status || '') !== f.status) return false
    if (f.interceptedOnly && !entry.intercepted) return false
    const text = f.url.trim().toLowerCase()
    if (text && !String(entry.url || '').toLowerCase().includes(text)) return false
    return true
  })

  const logsScope = state.page === 'diagnostics' ? 'app' : 'web'
  state.filteredLogs = state.logs.filter(log => {
    if (state.logsFilter.level !== 'ANY' && log.level !== state.logsFilter.level) return false
    if (normalizeLogScope(log.scope) !== logsScope) return false
    const text = state.logsFilter.search.trim().toLowerCase()
    if (text && !(`${log.message || ''} ${log.url || ''}`).toLowerCase().includes(text)) return false
    return true
  })
}

function renderSettingsPage() {
  const lang = state.settings.language || 'en'
  return `
    <section class="card">
      <h3>${t('common.settings')}</h3>
      <div class="grid two">
        <label class="switch"><input type="checkbox" id="settings-auto-attach" ${state.settings.autoAttach ? 'checked' : ''}/> ${t('fullapp.autoAttach')}</label>
        <label class="switch"><input type="checkbox" id="settings-auto-reload" ${state.settings.autoReloadAfterRuleChange ? 'checked' : ''}/> ${t('fullapp.autoReloadAfterRuleChange')}</label>
        <div>
          <div class="muted">${t('language.title')}</div>
          <select class="select" id="settings-language">
            <option value="en" ${lang === 'en' ? 'selected' : ''}>${t('language.english')}</option>
            <option value="pt" ${lang === 'pt' ? 'selected' : ''}>${t('language.portuguese')}</option>
            <option value="es" ${lang === 'es' ? 'selected' : ''}>${t('language.spanish')}</option>
          </select>
        </div>
        <div>
          <div class="muted">${t('fullapp.maxNetworkEntries')}</div>
          <input class="input" id="settings-max-network" type="number" value="${state.settings.maxNetworkEntries || 300}" />
        </div>
        <div>
          <div class="muted">${t('fullapp.maxLogs')}</div>
          <input class="input" id="settings-max-logs" type="number" value="${state.settings.maxLogs || 300}" />
        </div>
      </div>
      <div class="footer-actions"><button class="btn primary" id="settings-save-btn">${t('fullapp.saveSettings')}</button></div>
    </section>
  `
}

function renderPage() {
  if (state.page === 'dashboard') return renderDashboardPage(state)
  if (state.page === 'rules') return `${renderRulesPage(state)}${renderRuleEditor(state)}`
  if (state.page === 'collections') return renderCollectionsPage(state)
  if (state.page === 'network') return renderNetworkPage(state)
  if (state.page === 'logs') return renderLogsPage(state)
  if (state.page === 'import-export') return renderImportExportPage(state)
  if (state.page === 'diagnostics') return renderDiagnosticsPage(state)
  if (state.page === 'settings') return renderSettingsPage()
  return '<section class="card"><h3>Unknown page</h3></section>'
}

function render() {
  const root = $('#app')
  const focusSnapshot = captureFocusSnapshot()
  const isSplitScrollPage = state.page === 'network' || state.page === 'logs' || state.page === 'rules' || state.page === 'collections'
  root.innerHTML = renderAppShell({
    sidebar: renderSidebar(state.page),
    topbar: renderTopbar(state),
    content: renderPage(),
    contentClass: isSplitScrollPage ? 'app-content-split' : ''
  }) + renderNetworkInspectorModal(state)
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
  bindEvents()
  restoreFocusSnapshot(focusSnapshot)
}

function bindTopbarEvents() {
  $('#full-attach-btn')?.addEventListener('click', async () => {
    const preferredTabId = state.candidateTab?.id || state.lastAttachableTab?.id || null
    const result = await sendMessage({ type: MSG.DEBUG_ATTACH, tabId: preferredTabId })
    if (result?.error) {
      toastError(translateBackendError(result.error), backendErrorDuration(result.error))
      return
    }
    await refreshState()
  })
  $('#full-detach-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.DEBUG_DETACH })
    await refreshState()
  })
  $('#full-open-auto-attach-settings')?.addEventListener('click', () => {
    state.page = 'settings'
    render()
  })
  $('#full-reload-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.TAB_RELOAD })
    if (result?.error) toastError(translateBackendError(result.error))
  })
  $('#full-focus-tab-btn')?.addEventListener('click', async () => {
    const targetTabId = state.attachedTab?.id || state.candidateTab?.id || state.lastAttachableTab?.id || null
    if (!targetTabId) return
    await chrome.tabs.update(targetTabId, { active: true }).catch(() => {})
    const tab = await chrome.tabs.get(targetTabId).catch(() => null)
    if (tab?.windowId != null) {
      await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {})
    }
  })
}

function refreshTopbarOnly() {
  const topbarEl = document.querySelector('.topbar')
  if (!topbarEl) {
    render()
    return
  }
  const focusSnapshot = captureFocusSnapshot()
  topbarEl.outerHTML = renderTopbar(state)
  bindTopbarEvents()
  restoreFocusSnapshot(focusSnapshot)
}

function sameTabRef(a, b) {
  const left = a || null
  const right = b || null
  return (left?.id ?? null) === (right?.id ?? null)
    && (left?.url ?? null) === (right?.url ?? null)
    && (left?.title ?? null) === (right?.title ?? null)
}

function connectionChanged(current, next) {
  return (current.attachedTabId ?? null) !== (next.attachedTabId ?? null)
    || !sameTabRef(current.attachedTab, next.attachedTab)
    || !sameTabRef(current.activeTab, next.activeTab)
    || !sameTabRef(current.candidateTab, next.candidateTab)
    || !sameTabRef(current.lastAttachableTab, next.lastAttachableTab)
}

let pendingConnectionPatch = null
const flushConnectionUpdate = debounce(() => {
  if (!pendingConnectionPatch) return
  const patch = pendingConnectionPatch
  pendingConnectionPatch = null

  const current = {
    attachedTabId: state.attachedTabId ?? null,
    attachedTab: state.attachedTab ?? null,
    activeTab: state.activeTab ?? null,
    candidateTab: state.candidateTab ?? null,
    lastAttachableTab: state.lastAttachableTab ?? null
  }
  const next = {
    attachedTabId: patch.attachedTabId ?? current.attachedTabId,
    attachedTab: patch.attachedTab ?? current.attachedTab,
    activeTab: patch.activeTab ?? current.activeTab,
    candidateTab: patch.candidateTab ?? current.candidateTab,
    lastAttachableTab: patch.lastAttachableTab ?? current.lastAttachableTab
  }

  const changed = connectionChanged(current, next)
  state.attachedTabId = next.attachedTabId
  state.attachedTab = next.attachedTab
  state.activeTab = next.activeTab
  state.candidateTab = next.candidateTab
  state.lastAttachableTab = next.lastAttachableTab

  if (!changed) return
  refreshTopbarOnly()
}, 120)

function queueConnectionPatch(patch) {
  pendingConnectionPatch = { ...(pendingConnectionPatch || {}), ...patch }
  flushConnectionUpdate()
}

function openInspector(entryId) {
  const entry = state.networkEntries.find(e => e.id === entryId)
  if (!entry) return
  state.selectedNetworkEntryId = entryId
  state.inspector = { entryId, tab: 'overview' }
  render()
}

function closeInspector() {
  state.inspector = null
  render()
}

function setInspectorTab(tab) {
  if (!state.inspector) return
  state.inspector.tab = tab
  render()
  if (tab === 'response') {
    const entry = state.networkEntries.find(e => e.id === state.inspector.entryId)
    if (entry && entry.responseBodyLoaded === 'idle' && !expectsNoBody(entry)) {
      loadInspectorBody()
    }
  }
}

async function loadInspectorBody() {
  if (!state.inspector) return
  const entryId = state.inspector.entryId
  const entry = state.networkEntries.find(e => e.id === entryId)
  if (!entry) return
  entry.responseBodyLoaded = 'loading'
  refreshInspectorBodyOnly()
  const result = await sendMessage({ type: MSG.NETWORK_GET_BODY, entryId })
  if (result?.error) {
    entry.responseBodyLoaded = 'error'
    toastError(t('toasts.bodyLoadError'))
  } else {
    entry.responseBody = result.body
    entry.responseBodyBase64Encoded = result.base64Encoded
    entry.responseBodyTruncated = result.truncated
    entry.responseBodyLoaded = 'loaded'
  }
  refreshInspectorBodyOnly()
}

function refreshInspectorBodyOnly() {
  if (!state.inspector) return
  const bodyEl = document.querySelector('#inspector-body')
  if (!bodyEl) return
  const entry = state.networkEntries.find(e => e.id === state.inspector.entryId)
  if (!entry) {
    closeInspector()
    return
  }
  bodyEl.innerHTML = renderInspectorBody(entry, state.inspector.tab || 'overview')
  bindInspectorBodyEvents()
}

function bindInspectorBodyEvents() {
  document.querySelector('[data-inspector-load-body]')?.addEventListener('click', loadInspectorBody)
  document.querySelectorAll('[data-inspector-copy-header]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const [name, value] = String(btn.dataset.inspectorCopyHeader || '').split('::')
      try {
        await copyTextToClipboard(`${name}: ${value}`)
        toastSuccess(t('toasts.headerCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })
  document.querySelectorAll('[data-inspector-copy-all]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = state.networkEntries.find(e => e.id === state.inspector?.entryId)
      if (!entry) return
      const which = btn.dataset.inspectorCopyAll
      const headers = which === 'request' ? entry.requestHeaders : entry.responseHeaders
      const text = (headers || []).map(h => `${h.name}: ${h.value}`).join('\n')
      try {
        await copyTextToClipboard(text)
        toastSuccess(t('toasts.headersCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })
  document.querySelectorAll('[data-inspector-copy-body]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = state.networkEntries.find(e => e.id === state.inspector?.entryId)
      if (!entry) return
      const kind = btn.dataset.inspectorCopyBody
      const text = kind === 'request' ? (entry.requestPostData || '') : (entry.responseBody || '')
      if (!text) return
      try {
        await copyTextToClipboard(text)
        toastSuccess(t('toasts.bodyCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })
}

function closeEditor() {
  state.editingRule = null
  state.editorMode = 'create'
  state.editorPristine = true
  render()
}

async function applyPreset(presetId) {
  const preset = getPresetById(presetId)
  if (!preset || !state.editingRule) return
  const needsConfirm = state.editorMode === 'edit' || !state.editorPristine
  if (needsConfirm) {
    const ok = await confirmDialog({
      title: t('presets.applyTitle'),
      message: t('presets.applyConfirm', { preset: t(preset.labelKey) }),
      confirmLabel: t('presets.applyConfirmBtn'),
      cancelLabel: t('common.cancel')
    })
    if (!ok) return
  }
  state.editingRule = applyPresetToRule(state.editingRule, preset)
  state.editorPristine = false
  toastSuccess(t('toasts.presetApplied', { preset: t(preset.labelKey) }))
  render()
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

async function importRuleBundle(bundle) {
  if (!bundle?.rule) {
    toastError(t('toasts.ruleImportError'))
    return
  }
  const activeCollectionId = state.settings.activeCollectionId || state.collections[0]?.id
  const existingNames = state.rules
    .filter(rule => rule.collectionId === activeCollectionId)
    .map(rule => rule.name)
  const seed = bundle.rule
  const payload = {
    ...seed,
    id: null,
    collectionId: activeCollectionId,
    name: getUniqueName(seed.name, existingNames),
    action: {
      ...seed.action,
      applyResponseBody: seed.action?.applyResponseBody ?? true,
      applyResponseHeaders: seed.action?.applyResponseHeaders ?? false
    }
  }
  const result = await sendMessage({ type: MSG.RULES_CREATE, payload })
  if (result?.error) {
    toastError(t('toasts.ruleImportError'))
    return
  }
  toastSuccess(t('toasts.ruleImported'))
  await refreshState()
}

async function importCollectionBundle(bundle) {
  if (!bundle?.collection || !Array.isArray(bundle.rules)) {
    toastError(t('toasts.collectionImportError'))
    return
  }
  const existingCollectionNames = state.collections.map(item => item.name)
  const seedCollection = bundle.collection
  const newCollectionName = getUniqueName(seedCollection.name, existingCollectionNames)
  const collectionPayload = makeCollection({
    name: newCollectionName,
    description: seedCollection.description,
    enabled: seedCollection.enabled !== false,
    order: state.collections.length
  })
  const createResult = await sendMessage({ type: MSG.COLLECTIONS_CREATE, payload: collectionPayload })
  if (createResult?.error) {
    toastError(t('toasts.collectionImportError'))
    return
  }

  const usedNames = []
  for (const rule of bundle.rules) {
    const ruleName = getUniqueName(rule.name, usedNames)
    usedNames.push(ruleName)
    const rulePayload = {
      ...rule,
      id: null,
      collectionId: collectionPayload.id,
      name: ruleName,
      action: {
        ...rule.action,
        applyResponseBody: rule.action?.applyResponseBody ?? true,
        applyResponseHeaders: rule.action?.applyResponseHeaders ?? false
      }
    }
    await sendMessage({ type: MSG.RULES_CREATE, payload: rulePayload })
  }
  toastSuccess(t('toasts.collectionImported'))
  await refreshState()
}

async function importBundleFromText(raw) {
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    toastError(t('toasts.invalidJson'))
    return false
  }
  if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
    toastError(t('toasts.unsupportedType'))
    return false
  }
  if (parsed.type === BUNDLE_TYPE_RULE) {
    await importRuleBundle(parsed)
    return true
  }
  if (parsed.type === BUNDLE_TYPE_COLLECTION) {
    await importCollectionBundle(parsed)
    return true
  }
  toastError(t('toasts.unsupportedType'))
  return false
}

function bindCreateRuleFromRequestEvents() {
  document.querySelectorAll('[data-full-create-from-request]').forEach(button => {
    button.addEventListener('click', async event => {
      event.stopPropagation()
      const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId: button.dataset.fullCreateFromRequest })
      if (result?.error) return toastError(result.error || t('rules.createFromRequestError'))
      state.page = 'rules'
      state.editingRule = result.createdRule || null
      state.editorMode = 'create'
      state.editorPristine = true
      await refreshState()
    })
  })
  document.querySelectorAll('[data-entry-id]').forEach(row => {
    row.addEventListener('click', event => {
      if (event.target.closest('[data-full-create-from-request]')) return
      openInspector(row.dataset.entryId)
    })
  })
}

function refreshNetworkTableOnly() {
  if (state.page !== 'network') return
  const table = $('#full-network-table')
  if (!table) return
  table.innerHTML = renderNetworkRows(state)
  const countEl = $('#full-network-count')
  if (countEl) {
    const total = state.networkEntries.filter(isRenderableNetworkEntry).length
    const filtered = state.filteredNetworkEntries?.length ?? total
    countEl.textContent = t('network.resultsCount', { filtered, total })
  }
  bindCreateRuleFromRequestEvents()
}

function readEditorRule() {
  if (!state.editingRule) return null
  return {
    ...clone(state.editingRule),
    name: $('#editor-name')?.value || state.editingRule.name,
    priority: Number($('#editor-priority')?.value || state.editingRule.priority),
    match: {
      ...state.editingRule.match,
      method: $('#editor-method')?.value || state.editingRule.match.method,
      matchType: $('#editor-match-type')?.value || state.editingRule.match.matchType,
      resourceType: $('#editor-resource')?.value || state.editingRule.match.resourceType,
      urlPattern: $('#editor-url')?.value || state.editingRule.match.urlPattern
    },
    action: {
      ...state.editingRule.action,
      type: $('#editor-action-type')?.value || state.editingRule.action.type,
      statusCode: Number($('#editor-status-code')?.value || state.editingRule.action.statusCode),
      delayMs: Number($('#editor-delay')?.value || state.editingRule.action.delayMs),
      applyResponseBody: $('#editor-apply-body')?.checked ?? true,
      applyResponseHeaders: $('#editor-apply-headers')?.checked ?? false,
      contentType: $('#editor-content-type')?.value || state.editingRule.action.contentType,
      responseHeaders: $('#editor-response-headers')?.value || '',
      responseBody: $('#editor-response-body')?.value || ''
    }
  }
}

async function openFullPage(page) {
  state.page = page
  render()
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => openFullPage(button.dataset.page)))
  bindTopbarEvents()

  $('#full-rules-collection')?.addEventListener('change', async event => {
    await sendMessage({ type: MSG.SETTINGS_UPDATE, payload: { activeCollectionId: event.target.value } })
    await refreshState()
  })

  $('#full-rules-search')?.addEventListener('input', event => {
    state.rulesSearch = event.target.value
    render()
  })

  $('#full-collections-search')?.addEventListener('input', event => {
    state.collectionsSearch = event.target.value
    render()
  })

  $('#full-new-rule-btn')?.addEventListener('click', () => {
    state.editingRule = makeRule({ collectionId: state.settings.activeCollectionId }, state.settings.activeCollectionId)
    state.editorMode = 'create'
    state.editorPristine = true
    render()
  })

  document.querySelectorAll('[data-full-rule-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = state.rules.find(item => item.id === button.dataset.fullRuleEdit)
      if (!rule) return
      state.editingRule = clone(rule)
      state.editorMode = 'edit'
      state.editorPristine = false
      render()
    })
  })

  document.querySelectorAll('[data-preset-apply]').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.presetApply))
  })

  const editorBackdrop = document.querySelector('[data-modal-backdrop]:not([data-inspector-backdrop])')
  if (editorBackdrop && state.editingRule) {
    const markDirty = () => { state.editorPristine = false }
    editorBackdrop.addEventListener('input', markDirty)
    editorBackdrop.addEventListener('change', markDirty)
  }

  document.querySelectorAll('[data-full-rule-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t('rules.deleteTitle'),
        message: t('rules.deleteConfirm'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true
      })
      if (!ok) return
      const ruleId = button.dataset.fullRuleDelete
      await sendMessage({ type: MSG.RULES_DELETE, ruleId })
      if (state.editingRule?.id === ruleId) state.editingRule = null
      toastSuccess(t('rules.deleteSuccess'))
      await refreshState()
    })
  })

  document.querySelectorAll('[data-full-rule-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const rule = state.rules.find(item => item.id === button.dataset.fullRuleCopy)
      if (!rule) return
      try {
        await copyJsonToClipboard(createRuleBundle(rule))
        toastSuccess(t('toasts.ruleCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })

  document.querySelectorAll('[data-full-rule-export]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = state.rules.find(item => item.id === button.dataset.fullRuleExport)
      if (!rule) return
      try {
        downloadJsonFile(createRuleBundle(rule), buildRuleFilename(rule))
        toastSuccess(t('toasts.ruleExported'))
      } catch {
        toastError(t('toasts.exportError'))
      }
    })
  })

  document.querySelectorAll('[data-full-rule-toggle]').forEach(input => {
    input.addEventListener('change', async () => {
      await sendMessage({ type: MSG.RULES_TOGGLE, ruleId: input.dataset.fullRuleToggle, enabled: input.checked })
      await refreshState()
    })
  })

  $('#editor-save-rule')?.addEventListener('click', async () => {
    const payload = readEditorRule()
    if (!payload) return
    const errors = validateRule(payload)
    if (errors.length) {
      toastError(t(`errors.${errors[0]}`))
      return
    }
    const type = payload.id ? MSG.RULES_UPDATE : MSG.RULES_CREATE
    const result = await sendMessage({ type, payload })
    if (result?.error) return toastError(translateBackendError(result.error))
    state.editingRule = null
    toastSuccess(t('rules.saveSuccess'))
    await refreshState()
  })

  $('#editor-cancel-rule')?.addEventListener('click', closeEditor)
  $('#editor-close-x')?.addEventListener('click', closeEditor)
  document.querySelector('[data-modal-backdrop]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeEditor()
  })

  $('#full-new-collection-btn')?.addEventListener('click', async () => {
    const name = await promptDialog({
      title: t('collections.newCollectionTitle'),
      placeholder: t('collections.newCollectionPlaceholder'),
      confirmLabel: t('common.create'),
      cancelLabel: t('common.cancel')
    })
    if (!name) return
    await sendMessage({ type: MSG.COLLECTIONS_CREATE, payload: makeCollection({ name, order: state.collections.length }) })
    await refreshState()
  })

  document.querySelectorAll('[data-full-collection-enable]').forEach(input => {
    input.addEventListener('change', async () => {
      const current = state.collections.find(item => item.id === input.dataset.fullCollectionEnable)
      if (!current) return
      await sendMessage({ type: MSG.COLLECTIONS_UPDATE, payload: { ...current, enabled: input.checked } })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-full-collection-set-active]').forEach(input => {
    input.addEventListener('change', async () => {
      const activeCollectionId = input.dataset.fullCollectionSetActive
      if (!activeCollectionId) return
      await sendMessage({ type: MSG.SETTINGS_UPDATE, payload: { activeCollectionId } })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-full-collection-rename]').forEach(button => {
    button.addEventListener('click', async () => {
      const collection = state.collections.find(item => item.id === button.dataset.fullCollectionRename)
      if (!collection) return
      const name = await promptDialog({
        title: t('collections.renameTitle'),
        placeholder: t('collections.renamePlaceholder'),
        defaultValue: collection.name,
        confirmLabel: t('common.save'),
        cancelLabel: t('common.cancel')
      })
      if (!name) return
      await sendMessage({ type: MSG.COLLECTIONS_UPDATE, payload: { ...collection, name } })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-full-collection-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: t('collections.deleteTitle'),
        message: t('collections.deleteConfirm'),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true
      })
      if (!ok) return
      await sendMessage({ type: MSG.COLLECTIONS_DELETE, collectionId: button.dataset.fullCollectionDelete })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-full-collection-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const collection = state.collections.find(item => item.id === button.dataset.fullCollectionCopy)
      if (!collection) return
      try {
        await copyJsonToClipboard(createCollectionBundle(collection, state.rules))
        toastSuccess(t('toasts.collectionCopied'))
      } catch {
        toastError(t('toasts.copyError'))
      }
    })
  })

  document.querySelectorAll('[data-full-collection-export]').forEach(button => {
    button.addEventListener('click', () => {
      const collection = state.collections.find(item => item.id === button.dataset.fullCollectionExport)
      if (!collection) return
      try {
        downloadJsonFile(createCollectionBundle(collection, state.rules), buildCollectionFilename(collection))
        toastSuccess(t('toasts.collectionExported'))
      } catch {
        toastError(t('toasts.exportError'))
      }
    })
  })

  $('#full-import-rule-btn')?.addEventListener('click', () => openFullPage('import-export'))

  $('#full-network-url')?.addEventListener('input', event => {
    state.networkFilter.url = event.target.value
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-method')?.addEventListener('change', event => {
    state.networkFilter.method = event.target.value
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-status')?.addEventListener('input', event => {
    state.networkFilter.status = event.target.value
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-intercepted')?.addEventListener('change', event => {
    state.networkFilter.interceptedOnly = event.target.checked
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-clear')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.NETWORK_CLEAR })
    state.selectedNetworkEntryId = null
    state.inspector = null
    await refreshState()
  })

  bindCreateRuleFromRequestEvents()

  $('#full-logs-level')?.addEventListener('change', event => {
    state.logsFilter.level = event.target.value
    applyLocalFilters()
    render()
  })
  $('#full-logs-search')?.addEventListener('input', event => {
    state.logsFilter.search = event.target.value
    applyLocalFilters()
    render()
  })
  $('#full-clear-logs')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.LOGS_CLEAR })
    await refreshState()
  })

  $('#full-import-json-btn')?.addEventListener('click', async () => {
    const textarea = $('#full-import-json')
    const raw = textarea?.value || ''
    if (!raw.trim()) return
    const ok = await importBundleFromText(raw)
    if (ok && textarea) textarea.value = ''
  })

  $('#full-import-pick-file-btn')?.addEventListener('click', () => {
    $('#full-import-file-input')?.click()
  })

  $('#full-import-file-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      event.target.value = ''
      await importBundleFromText(text)
    } catch {
      toastError(t('toasts.importError'))
    }
  })

  // Network Inspector modal binds
  document.querySelector('[data-inspector-backdrop]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeInspector()
  })
  $('#inspector-close-x')?.addEventListener('click', closeInspector)
  document.querySelectorAll('[data-inspector-tab]').forEach(btn => {
    btn.addEventListener('click', () => setInspectorTab(btn.dataset.inspectorTab))
  })
  document.querySelectorAll('[data-inspector-action]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const entry = state.networkEntries.find(e => e.id === state.inspector?.entryId)
      if (!entry) return
      const action = btn.dataset.inspectorAction
      if (action === 'create-rule') {
        const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId: entry.id })
        if (result?.error) {
          toastError(translateBackendError(result.error))
          return
        }
        state.inspector = null
        state.page = 'rules'
        state.editingRule = result.createdRule || null
        state.editorMode = 'create'
        state.editorPristine = true
        await refreshState()
        return
      }
      if (action === 'copy-fetch') {
        try {
          await copyTextToClipboard(entryToFetch(entry))
          toastSuccess(t('toasts.fetchCopied'))
        } catch {
          toastError(t('toasts.copyError'))
        }
        return
      }
      if (action === 'copy-curl') {
        try {
          await copyTextToClipboard(entryToCurl(entry))
          toastSuccess(t('toasts.curlCopied'))
        } catch {
          toastError(t('toasts.copyError'))
        }
        return
      }
    })
  })
  bindInspectorBodyEvents()

  $('#settings-save-btn')?.addEventListener('click', async () => {
    const payload = {
      autoAttach: $('#settings-auto-attach')?.checked ?? false,
      autoReloadAfterRuleChange: $('#settings-auto-reload')?.checked ?? false,
      language: $('#settings-language')?.value || 'en',
      maxNetworkEntries: Number($('#settings-max-network')?.value || 300),
      maxLogs: Number($('#settings-max-logs')?.value || 300)
    }
    const result = await sendMessage({ type: MSG.SETTINGS_UPDATE, payload })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    setLocale(payload.language)
    await refreshState()
    toastSuccess(t('fullapp.settingsSaved'))
  })
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state:network') {
    state.networkEntries = message.networkEntries
    if (state.page === 'network') {
      applyLocalFilters()
      refreshNetworkTableOnly()
    }
    if (state.inspector) {
      const entry = state.networkEntries.find(e => e.id === state.inspector.entryId)
      if (entry) refreshInspectorBodyOnly()
      else closeInspector()
    }
  }
  if (message?.type === 'state:logs') {
    state.logs = message.logs
    if (state.page === 'logs' || state.page === 'diagnostics') {
      applyLocalFilters()
      render()
    }
  }
  if (message?.type === 'state:attached') {
    queueConnectionPatch({ attachedTabId: message.attachedTabId ?? null })
  }
  if (message?.type === 'state:connection') {
    queueConnectionPatch({
      attachedTabId: message.attachedTabId ?? null,
      attachedTab: message.attachedTab ?? null,
      activeTab: message.activeTab ?? null,
      candidateTab: message.candidateTab ?? null,
      lastAttachableTab: message.lastAttachableTab ?? null
    })
  }
  if (message?.type === 'state:activeTab') {
    queueConnectionPatch({ activeTab: message.activeTab ?? null })
  }
  if (message?.type === 'state:hit') {
    const rule = state.rules.find(r => r.id === message.ruleId)
    if (rule) {
      rule.diagnostics = rule.diagnostics || {}
      rule.diagnostics.matchCount = message.matchCount
      rule.diagnostics.lastMatchedAt = message.lastMatchedAt
    }
    const hitEl = document.querySelector(`[data-rule-hit="${message.ruleId}"]`)
    if (hitEl) hitEl.textContent = String(message.matchCount)
    const stateEl = document.querySelector(`[data-rule-state="${message.ruleId}"]`)
    if (stateEl) {
      stateEl.setAttribute('data-state', 'matched')
      const label = stateEl.querySelector('.badge-label')
      if (label) label.textContent = t('rules.states.matched')
    }
  }
  if (message?.type === 'state:hit-reset') {
    for (const rule of state.rules) {
      if (rule?.diagnostics) rule.diagnostics.lastMatchedAt = null
    }
    render()
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return

  const onlyLogsChanged = Boolean(changes.logs)
    && !changes.settings
    && !changes.collections
    && !changes.rules

  if (onlyLogsChanged && state.page !== 'logs' && state.page !== 'diagnostics') {
    return
  }

  if (changes.settings) {
    if (isOnlyNetworkFiltersDiff(changes.settings.oldValue, changes.settings.newValue)) {
      return
    }
  }
  if (changes.rules) {
    if (isHitOnlyDiff(changes.rules.oldValue, changes.rules.newValue)) {
      // diagnostics-only changes (matchCount/lastMatchedAt) ja sao tratados via state:hit broadcast
      return
    }
  }
  if (changes.settings || changes.collections || changes.rules || changes.logs) {
    refreshState()
  }
})

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return
  if (state.inspector) {
    closeInspector()
    return
  }
  if (state.editingRule) closeEditor()
})

function hydrateNetworkFilterFromSettings() {
  state.networkFilter = {
    ...DEFAULT_NETWORK_FILTER_FULL,
    ...(state.settings?.networkFilters?.fullApp || {})
  }
}

const persistFullAppNetworkFilter = debounce(async () => {
  await sendMessage({
    type: MSG.SETTINGS_UPDATE,
    payload: {
      networkFilters: {
        ...(state.settings.networkFilters || {}),
        fullApp: { ...state.networkFilter }
      }
    }
  })
}, 300)

async function bootstrap() {
  await refreshState()

  const params = new URLSearchParams(window.location.search)
  const editId = params.get('edit')
  const draft = params.get('draft')
  const targetPage = params.get('page')
  const filterUrl = params.get('filterUrl')
  const inspectId = params.get('inspect')

  if (editId) {
    const rule = state.rules.find(item => item.id === editId)
    window.history.replaceState({}, '', window.location.pathname)
    if (rule) {
      state.page = 'rules'
      state.editingRule = clone(rule)
      state.editorMode = 'edit'
      state.editorPristine = false
      render()
      return
    }
  } else if (draft) {
    try {
      const draftRule = JSON.parse(draft)
      if (draftRule && typeof draftRule === 'object') {
        state.page = 'rules'
        state.editingRule = draftRule
        state.editorMode = 'create'
        state.editorPristine = true
        window.history.replaceState({}, '', window.location.pathname)
        render()
        return
      }
    } catch {
      window.history.replaceState({}, '', window.location.pathname)
    }
  } else if (inspectId) {
    state.page = 'network'
    const entry = state.networkEntries.find(e => e.id === inspectId)
    if (entry) {
      state.selectedNetworkEntryId = inspectId
      state.inspector = { entryId: inspectId, tab: 'overview' }
    }
    window.history.replaceState({}, '', window.location.pathname)
    render()
    return
  } else if (targetPage) {
    window.history.replaceState({}, '', window.location.pathname)
    state.page = targetPage
    if (targetPage === 'network' && filterUrl) {
      state.networkFilter.url = filterUrl
      applyLocalFilters()
    }
    render()
    return
  }
  render()
}

bootstrap()
