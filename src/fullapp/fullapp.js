import { MSG, sendMessage } from '../shared/messaging.js'
import { clone } from '../shared/utils.js'
import { makeCollection, makeRule } from '../shared/models.js'
import { validateRule } from '../shared/validators.js'
import { setLocale, t } from '../shared/i18n.js'
import {
  createRuleBundle,
  createCollectionBundle,
  copyJsonToClipboard,
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
import { renderAppShell } from './components/app-shell.js'
import { renderSidebar } from './components/sidebar.js'
import { renderTopbar } from './components/topbar.js'
import { renderDashboardPage } from './components/dashboard-page.js'
import { renderRulesPage } from './components/rules-page.js'
import { renderRuleEditor } from './components/rule-editor.js'
import { renderCollectionsPage } from './components/collections-page.js'
import { renderNetworkPage, renderNetworkRows } from './components/network-page.js'
import { renderLogsPage } from './components/logs-page.js'
import { renderImportExportPage } from './components/import-export-page.js'
import { renderDiagnosticsPage } from './components/diagnostics-page.js'

const state = {
  page: 'dashboard',
  collections: [],
  rules: [],
  logs: [],
  networkEntries: [],
  activeTab: null,
  attachedTabId: null,
  settings: {},

  editingRule: null,
  rulesSearch: '',
  networkFilter: {
    url: '',
    method: 'ANY',
    status: '',
    matchedOnly: false,
    interceptedOnly: false
  },
  logsFilter: {
    level: 'ANY',
    search: ''
  },
  filteredNetworkEntries: [],
  filteredLogs: [],
  lastImportExportMessage: ''
}

function $(selector) {
  return document.querySelector(selector)
}

async function refreshState() {
  const next = await sendMessage({ type: MSG.STATE_GET })
  if (next?.error) return
  Object.assign(state, next)
  setLocale(state.settings?.language || 'en')
  if (state.editingRule) {
    state.editingRule = state.rules.find(rule => rule.id === state.editingRule.id) || null
  }
  applyLocalFilters()
  render()
}

function applyLocalFilters() {
  state.filteredNetworkEntries = state.networkEntries.filter(entry => {
    const f = state.networkFilter
    if (f.method !== 'ANY' && entry.method !== f.method) return false
    if (f.status && String(entry.status || '') !== f.status) return false
    if (f.matchedOnly && !entry.matchedRuleId) return false
    if (f.interceptedOnly && !entry.intercepted) return false
    const text = f.url.trim().toLowerCase()
    if (text && !String(entry.url || '').toLowerCase().includes(text)) return false
    return true
  })

  state.filteredLogs = state.logs.filter(log => {
    if (state.logsFilter.level !== 'ANY' && log.level !== state.logsFilter.level) return false
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
  root.innerHTML = renderAppShell({
    sidebar: renderSidebar(state.page),
    topbar: renderTopbar(state),
    content: renderPage()
  })
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
  bindEvents()
}

function closeEditor() {
  state.editingRule = null
  render()
}

function translateBackendError(code) {
  if (!code) return t('rules.saveError')
  const key = `errors.${code}`
  const value = t(key)
  return value === key ? code : value
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
    button.addEventListener('click', async () => {
      const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId: button.dataset.fullCreateFromRequest })
      if (result?.error) return toastError(result.error || t('rules.createFromRequestError'))
      state.page = 'rules'
      state.editingRule = result.createdRule || null
      await refreshState()
    })
  })
}

function refreshNetworkTableOnly() {
  if (state.page !== 'network') return
  const table = $('#full-network-table')
  if (!table) return
  table.innerHTML = renderNetworkRows(state)
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

  $('#full-attach-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.DEBUG_ATTACH })
    await refreshState()
  })
  $('#full-detach-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.DEBUG_DETACH })
    await refreshState()
  })
  $('#full-reload-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.TAB_RELOAD })
  })

  $('#full-rules-collection')?.addEventListener('change', async event => {
    await sendMessage({ type: MSG.SETTINGS_UPDATE, payload: { activeCollectionId: event.target.value } })
    await refreshState()
  })

  $('#full-rules-search')?.addEventListener('input', event => {
    state.rulesSearch = event.target.value
    render()
  })

  $('#full-new-rule-btn')?.addEventListener('click', () => {
    state.editingRule = makeRule({ collectionId: state.settings.activeCollectionId }, state.settings.activeCollectionId)
    render()
  })

  document.querySelectorAll('[data-full-rule-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = state.rules.find(item => item.id === button.dataset.fullRuleEdit)
      if (!rule) return
      state.editingRule = clone(rule)
      render()
    })
  })

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

  document.querySelectorAll('[data-full-collection-set-active]').forEach(button => {
    button.addEventListener('click', async () => {
      await sendMessage({ type: MSG.SETTINGS_UPDATE, payload: { activeCollectionId: button.dataset.fullCollectionSetActive } })
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
  })
  $('#full-network-method')?.addEventListener('change', event => {
    state.networkFilter.method = event.target.value
    applyLocalFilters()
    refreshNetworkTableOnly()
  })
  $('#full-network-status')?.addEventListener('input', event => {
    state.networkFilter.status = event.target.value
    applyLocalFilters()
    refreshNetworkTableOnly()
  })
  $('#full-network-matched')?.addEventListener('change', event => {
    state.networkFilter.matchedOnly = event.target.checked
    applyLocalFilters()
    refreshNetworkTableOnly()
  })
  $('#full-network-intercepted')?.addEventListener('change', event => {
    state.networkFilter.interceptedOnly = event.target.checked
    applyLocalFilters()
    refreshNetworkTableOnly()
  })
  $('#full-network-clear')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.NETWORK_CLEAR })
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

  $('#settings-save-btn')?.addEventListener('click', async () => {
    const payload = {
      autoAttach: $('#settings-auto-attach')?.checked ?? false,
      autoReloadAfterRuleChange: $('#settings-auto-reload')?.checked ?? false,
      language: $('#settings-language')?.value || 'en',
      maxNetworkEntries: Number($('#settings-max-network')?.value || 300),
      maxLogs: Number($('#settings-max-logs')?.value || 300)
    }
    await sendMessage({ type: MSG.SETTINGS_UPDATE, payload })
    setLocale(payload.language)
    await refreshState()
  })
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state:network') {
    state.networkEntries = message.networkEntries
    if (state.page === 'network' || state.page === 'dashboard') {
      applyLocalFilters()
      if (state.page === 'network') {
        refreshNetworkTableOnly()
      } else {
        render()
      }
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
    state.attachedTabId = message.attachedTabId
    render()
  }
})

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return
  if (changes.settings || changes.collections || changes.rules || changes.logs) {
    refreshState()
  }
})

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && state.editingRule) closeEditor()
})

async function bootstrap() {
  await refreshState()
  const params = new URLSearchParams(window.location.search)
  const editId = params.get('edit')
  const draft = params.get('draft')
  if (editId) {
    const rule = state.rules.find(item => item.id === editId)
    window.history.replaceState({}, '', window.location.pathname)
    if (rule) {
      state.page = 'rules'
      state.editingRule = clone(rule)
      render()
    }
  } else if (draft) {
    try {
      const draftRule = JSON.parse(draft)
      if (draftRule && typeof draftRule === 'object') {
        state.page = 'rules'
        state.editingRule = draftRule
        window.history.replaceState({}, '', window.location.pathname)
        render()
      }
    } catch {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }
}

bootstrap()
