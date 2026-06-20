import { MSG, sendMessage } from '../shared/messaging.js'
import { clone, debounce, escapeHtml, isHitOnlyDiff, isOnlyNetworkFiltersDiff, matchesNetworkIgnorePatterns, parseNetworkIgnorePatterns } from '../shared/utils.js'
import { makeCollection, makeRule } from '../shared/models.js'
import { validateRule } from '../shared/validators.js'
import { normalizeLocale, setLocale, t } from '../shared/i18n.js'
import { DEFAULT_NETWORK_FILTER_FULL, STORAGE_KEYS } from '../shared/constants.js'
import { getVisibleLogsForCapture, getVisibleNetworkEntriesForCapture, normalizeLogScope } from '../shared/capture-context.js'
import { mergeConnectionState } from '../shared/connection-state.js'
import { matchesStatusFilter } from '../shared/network-display.js'
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
import { choiceDialog, confirmDialog, promptDialog } from '../shared/dialogs.js'
import { findCollectionConflictById, parseImportBundle } from '../shared/import-bundles.js'
import { getPresetById, applyPresetToRule } from '../shared/presets.js'
import { entryToCurl, entryToFetch } from '../shared/network-format.js'
import { createLiveUpdateGuard, delegate, patchHtml } from '../shared/ui/dom.js'
import { renderButton } from '../shared/ui/button.js'
import { renderDataPanel } from '../shared/ui/data-panel.js'
import { bindSelectMenus, renderSelect } from '../shared/ui/select.js'
import { renderSwitch } from '../shared/ui/toggle.js'
import { renderAppShell } from './components/app-shell.js'
import { renderSidebar } from './components/sidebar.js'
import { renderTopbar } from './components/topbar.js'
import { renderDashboardPage } from './components/dashboard-page.js'
import { renderRulesPage } from './components/rules-page.js'
import { renderRuleEditor } from './components/rule-editor.js'
import { renderCollectionsPage } from './components/collections-page.js'
import { renderNetworkPage, renderNetworkFooter, renderNetworkRows, isRenderableNetworkEntry } from './components/network-page.js'
import { renderLogsFooter, renderLogsPage, renderLogsRows } from './components/logs-page.js'
import { renderImportExportPage } from './components/import-export-page.js'
import { renderDiagnosticsPage } from './components/diagnostics-page.js'
import { renderNetworkInspectorModal, renderInspectorBody, expectsNoBody } from './components/network-inspector-modal.js'
import { renderLogDetailModal } from '../shared/ui/log-detail.js'
import { renderReleaseNotesModal } from './components/release-notes-modal.js'
import { renderRuleMoveModal } from './components/rule-move-modal.js'
import { renderAiBridgeSettingsSection } from './components/ai-bridge-settings-section.js'
import { getReleaseNotesMenuState, hasReleaseNotesForVersion } from '../shared/release-notes.js'
import { initTooltips } from '../shared/ui/tooltip.js'
import { buildCollectionTemplate, buildRuleTemplate, getAiPrompt } from '../shared/import-template.js'
import { getBulkDeleteDialogCopy, getBulkDeleteSuccessMessage } from '../shared/bulk-delete-dialog.js'
import { buildAiBridgeMcpConfigText, createAiBridgeSessionState } from '../shared/ai-bridge-state.js'

const PAGE_IDS = ['dashboard', 'rules', 'collections', 'network', 'logs', 'import-export', 'diagnostics', 'settings']
const PAGE_URL_ALIASES = {
  import: 'import-export',
  'import-export': 'import-export'
}

function normalizePageId(page) {
  const value = PAGE_URL_ALIASES[page] || page
  return PAGE_IDS.includes(value) ? value : 'dashboard'
}

function pageToUrlSlug(page) {
  return page === 'import-export' ? 'import' : page
}

function getInitialPageFromUrl() {
  const params = new URLSearchParams(window.location.search)
  return normalizePageId(params.get('page'))
}

const state = {
  page: getInitialPageFromUrl(),
  collections: [],
  rules: [],
  logs: [],
  networkEntries: [],
  networkMeta: null,
  activeTab: null,
  attachedTab: null,
  compatActiveTab: null,
  candidateTab: null,
  lastAttachableTab: null,
  attachedTabId: null,
  compatActiveTabId: null,
  settings: {},
  releaseNotes: {
    lastSeenVersion: '',
    lastSeenAt: 0
  },
  aiBridgeSession: createAiBridgeSessionState(),
  aiBridgePendingImport: null,

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
  networkPagination: {
    page: 1,
    pageSize: 100
  },
  logsFilter: {
    level: 'ANY',
    search: ''
  },
  logsPagination: {
    page: 1,
    pageSize: 100
  },
  filteredNetworkEntries: [],
  visibleNetworkEntries: [],
  filteredLogs: [],
  visibleLogs: [],
  pagedLogs: [],
  lastImportExportMessage: '',
  inspector: null,
  selectedNetworkEntryId: null,
  selectedLogId: null,
  releaseNotesModal: null,
  ruleMoveModal: null,
  networkFilterHydrated: false
}

function $(selector) {
  return document.querySelector(selector)
}

const fullNetworkUpdateGuard = createLiveUpdateGuard({
  getTarget: () => document
})

const fullLogsUpdateGuard = createLiveUpdateGuard({
  getTarget: () => document
})

const NETWORK_ENTRY_CACHE_LIMIT = 500
const LOG_DETAIL_CACHE_LIMIT = 500
const networkEntryCache = new Map()
const logDetailCache = new Map()
let pendingNetworkPress = null
let pendingNetworkPressTimer = null
let pendingLogPress = null
let pendingLogPressTimer = null

function getPageTitleLabel(page = state.page) {
  const labels = {
    dashboard: t('navigation.dashboard'),
    rules: t('navigation.rules'),
    collections: t('navigation.collections'),
    network: t('navigation.network'),
    logs: t('navigation.logs'),
    'import-export': t('navigation.importExport'),
    diagnostics: t('navigation.diagnostics'),
    settings: t('navigation.settings')
  }
  return labels[page] || ''
}

function updateDocumentTitle() {
  const label = getPageTitleLabel()
  document.title = label ? `InterceptPilot · ${label}` : 'InterceptPilot'
}

function syncPageUrl(page = state.page) {
  const url = new URL(window.location.href)
  url.search = ''
  url.searchParams.set('page', pageToUrlSlug(normalizePageId(page)))
  window.history.replaceState({}, '', `${url.pathname}${url.search}`)
}

function setCurrentPage(page, options = {}) {
  const nextPage = normalizePageId(page)
  state.page = nextPage
  if (options.syncUrl !== false) syncPageUrl(nextPage)
  if (options.renderPage !== false) render()
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

function updateDataPanelScrollState(root = document) {
  const target = root instanceof Element ? root : document
  target.querySelectorAll('.data-panel__scroll').forEach(element => {
    const hasVerticalScroll = element.scrollHeight > element.clientHeight + 1
    element.classList.toggle('is-scrollable-y', hasVerticalScroll)
  })
  target.querySelectorAll('.data-table').forEach(table => {
    const rows = table.querySelector('.data-table__rows')
    if (!rows) return
    const hasVerticalScroll = rows.scrollHeight > rows.clientHeight + 1
    table.classList.toggle('is-scrollable-y', hasVerticalScroll)
  })
}

const updateDataPanelScrollStateSoon = debounce(() => {
  requestAnimationFrame(() => updateDataPanelScrollState())
}, 50)

window.addEventListener('resize', updateDataPanelScrollStateSoon)

async function refreshState() {
  const next = await sendMessage({ type: MSG.STATE_GET })
  if (next?.error) return
  Object.assign(state, next)
  setLocale(state.settings?.language)
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
  const visibleNetworkEntries = getVisibleNetworkEntriesForCapture(state)
  state.visibleNetworkEntries = visibleNetworkEntries
  state.filteredNetworkEntries = visibleNetworkEntries.filter(entry => {
    if (!isRenderableNetworkEntry(entry)) return false
    const f = state.networkFilter
    if (f.method !== 'ANY' && entry.method !== f.method) return false
    if (!matchesStatusFilter(entry.status, f.status)) return false
    if (f.interceptedOnly && !entry.intercepted) return false
    if (matchesNetworkIgnorePatterns(entry.url, state.settings?.networkIgnorePatterns || [])) return false
    const text = f.url.trim().toLowerCase()
    if (text && !String(entry.url || '').toLowerCase().includes(text)) return false
    return true
  })
  applyNetworkPagination()
  rememberNetworkEntries(state.pagedNetworkEntries)
  if (state.inspector?.entryId) ensureNetworkEntryAvailable(state.inspector.entryId)

  const logsScope = state.page === 'diagnostics' ? 'app' : 'web'
  const sourceLogs = logsScope === 'web' ? getVisibleLogsForCapture(state) : state.logs.filter(log => normalizeLogScope(log.scope) === 'app')
  state.visibleLogs = sourceLogs
  state.filteredLogs = sourceLogs.filter(log => {
    if (state.logsFilter.level !== 'ANY' && log.level !== state.logsFilter.level) return false
    const text = state.logsFilter.search.trim().toLowerCase()
    if (text && !(`${log.message || ''} ${log.url || ''}`).toLowerCase().includes(text)) return false
    return true
  })
  applyLogsPagination()
  rememberLogDetails(state.pagedLogs)
}

function applyNetworkPagination() {
  const pagination = state.networkPagination || { page: 1, pageSize: 100 }
  const pageSize = Math.max(1, Number(pagination.pageSize || 100))
  const total = state.filteredNetworkEntries.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Number(pagination.page || 1)), totalPages)
  state.networkPagination = { page, pageSize }
  const start = (page - 1) * pageSize
  state.pagedNetworkEntries = state.filteredNetworkEntries.slice(start, start + pageSize)
}

function resetNetworkPage() {
  state.networkPagination = { ...(state.networkPagination || {}), page: 1 }
}

function rememberNetworkEntries(entries = []) {
  for (const entry of entries) {
    if (!entry?.id) continue
    networkEntryCache.delete(entry.id)
    networkEntryCache.set(entry.id, entry)
  }
  while (networkEntryCache.size > NETWORK_ENTRY_CACHE_LIMIT) {
    const oldestKey = networkEntryCache.keys().next().value
    networkEntryCache.delete(oldestKey)
  }
}

function findNetworkEntryById(entryId) {
  return (state.visibleNetworkEntries || []).find(entry => entry.id === entryId)
    || (state.filteredNetworkEntries || []).find(entry => entry.id === entryId)
    || (state.pagedNetworkEntries || []).find(entry => entry.id === entryId)
    || networkEntryCache.get(entryId)
    || null
}

function ensureNetworkEntryAvailable(entryId) {
  const entry = findNetworkEntryById(entryId)
  if (!entry) return null
  if (!(state.visibleNetworkEntries || []).some(item => item.id === entryId)) {
    state.visibleNetworkEntries = [entry, ...(state.visibleNetworkEntries || [])]
  }
  return entry
}

function applyLogsPagination() {
  const pagination = state.logsPagination || { page: 1, pageSize: 100 }
  const pageSize = Math.max(1, Number(pagination.pageSize || 100))
  const total = state.filteredLogs.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(1, Number(pagination.page || 1)), totalPages)
  state.logsPagination = { page, pageSize }
  const start = (page - 1) * pageSize
  state.pagedLogs = state.filteredLogs.slice(start, start + pageSize)
}

function resetLogsPage() {
  state.logsPagination = { ...(state.logsPagination || {}), page: 1 }
}

function rememberLogDetails(logs = []) {
  for (const log of logs) {
    if (!log?.id) continue
    logDetailCache.delete(log.id)
    logDetailCache.set(log.id, log)
  }
  while (logDetailCache.size > LOG_DETAIL_CACHE_LIMIT) {
    const oldestKey = logDetailCache.keys().next().value
    logDetailCache.delete(oldestKey)
  }
}

function renderNetworkIgnoreChips() {
  const patterns = parseNetworkIgnorePatterns(state.settings.networkIgnorePatterns)
  return patterns.map(pattern => `
    <span class="tag-chip" data-network-ignore-chip="${escapeHtml(pattern)}">
      <span>${escapeHtml(pattern)}</span>
      <button type="button" class="tag-chip-remove" data-network-ignore-remove="${escapeHtml(pattern)}" aria-label="${escapeHtml(t('fullapp.removeNetworkIgnorePattern', { pattern }))}">×</button>
    </span>
  `).join('')
}

function setNetworkIgnorePatterns(patterns) {
  state.settings.networkIgnorePatterns = parseNetworkIgnorePatterns(patterns)
}

function refreshNetworkIgnoreChips() {
  const list = $('#settings-network-ignore-chip-list')
  if (list) list.innerHTML = renderNetworkIgnoreChips()
}

function addNetworkIgnorePatterns(rawValue) {
  const incoming = parseNetworkIgnorePatterns(rawValue)
  if (!incoming.length) return
  const current = parseNetworkIgnorePatterns(state.settings.networkIgnorePatterns)
  const seen = new Set(current.map(item => item.toLowerCase()))
  for (const pattern of incoming) {
    const key = pattern.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    current.push(pattern)
  }
  setNetworkIgnorePatterns(current)
  refreshNetworkIgnoreChips()
}

function removeNetworkIgnorePattern(pattern) {
  const target = String(pattern || '').toLowerCase()
  setNetworkIgnorePatterns(parseNetworkIgnorePatterns(state.settings.networkIgnorePatterns)
    .filter(item => item.toLowerCase() !== target))
  refreshNetworkIgnoreChips()
}

function normalizeSettingsNumber(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeSettingsSnapshot(settings = {}) {
  return {
    autoAttach: Boolean(settings.autoAttach),
    autoReloadAfterRuleChange: Boolean(settings.autoReloadAfterRuleChange),
    language: normalizeLocale(settings.language) || 'en',
    captureMode: String(settings.captureMode || 'auto').trim(),
    maxNetworkEntries: normalizeSettingsNumber(settings.maxNetworkEntries, 300),
    maxLogs: normalizeSettingsNumber(settings.maxLogs, 300),
    networkIgnorePatterns: parseNetworkIgnorePatterns(settings.networkIgnorePatterns)
  }
}

function readSettingsFormPayload() {
  const ignoreInput = $('#settings-network-ignore-input')
  return normalizeSettingsSnapshot({
    autoAttach: $('#settings-auto-attach')?.checked ?? false,
    autoReloadAfterRuleChange: $('#settings-auto-reload')?.checked ?? false,
    language: $('#settings-language')?.value || 'en',
    captureMode: $('#settings-capture-mode')?.value || 'auto',
    maxNetworkEntries: $('#settings-max-network')?.value || 300,
    maxLogs: $('#settings-max-logs')?.value || 300,
    networkIgnorePatterns: [
      ...parseNetworkIgnorePatterns(state.settings.networkIgnorePatterns),
      ...(ignoreInput?.value ? parseNetworkIgnorePatterns(ignoreInput.value) : [])
    ]
  })
}

function settingsSnapshotsEqual(a, b) {
  if (!a || !b) return false
  if (a.autoAttach !== b.autoAttach) return false
  if (a.autoReloadAfterRuleChange !== b.autoReloadAfterRuleChange) return false
  if (a.language !== b.language) return false
  if (a.captureMode !== b.captureMode) return false
  if (a.maxNetworkEntries !== b.maxNetworkEntries) return false
  if (a.maxLogs !== b.maxLogs) return false
  if (a.networkIgnorePatterns.length !== b.networkIgnorePatterns.length) return false
  return a.networkIgnorePatterns.every((pattern, index) => pattern === b.networkIgnorePatterns[index])
}

function setSettingsSaveEnabled(enabled) {
  const button = $('#settings-save-btn')
  if (!button) return
  button.disabled = !enabled
  const wrapper = button.closest('.btn-tooltip-wrapper')
  if (!wrapper) return
  if (enabled) {
    wrapper.removeAttribute('data-tooltip')
    wrapper.removeAttribute('data-tooltip-delay')
    wrapper.removeAttribute('tabindex')
    return
  }
  wrapper.setAttribute('data-tooltip', t('fullapp.saveSettingsDisabled'))
  wrapper.setAttribute('tabindex', '0')
}

function hasValidImportJson() {
  const raw = $('#full-import-json')?.value || ''
  if (!raw.trim()) return false
  try {
    JSON.parse(raw)
    return true
  } catch {
    return false
  }
}

function updateImportJsonButtonState() {
  const button = $('#full-import-json-btn')
  if (button) button.disabled = !hasValidImportJson()
}

function isJsonImportFile(file) {
  if (!file) return false
  const name = String(file.name || '').toLowerCase()
  const type = String(file.type || '').toLowerCase()
  return name.endsWith('.json') || type === 'application/json'
}

function setImportDropzoneActive(active) {
  $('#full-import-dropzone')?.classList.toggle('is-drag-over', Boolean(active))
}

async function prepareImportFile(file) {
  const textarea = $('#full-import-json')
  if (!textarea || !file) return
  try {
    const text = await file.text()
    textarea.value = text
    textarea.focus({ preventScroll: true })
    updateImportJsonButtonState()
    toastSuccess(t('toasts.importFileReady', { name: file.name || t('fullapp.importPickFile') }))
  } catch {
    toastError(t('toasts.importFileReadError'))
  }
}

function getCurrentExtensionVersion() {
  return chrome.runtime.getManifest?.().version || ''
}

function getCurrentReleaseNotesMenuState() {
  return getReleaseNotesMenuState({
    version: getCurrentExtensionVersion(),
    lastSeenVersion: state.releaseNotes?.lastSeenVersion,
    lastSeenAt: state.releaseNotes?.lastSeenAt
  })
}

function openReleaseNotes(manual = false) {
  const version = getCurrentExtensionVersion()
  if (!hasReleaseNotesForVersion(version)) return
  state.releaseNotesModal = { version, manual }
  render()
}

async function closeReleaseNotes() {
  const modal = state.releaseNotesModal
  state.releaseNotesModal = null
  if (modal?.version && state.releaseNotes?.lastSeenVersion !== modal.version) {
    const seenAt = Date.now()
    state.releaseNotes = { lastSeenVersion: modal.version, lastSeenAt: seenAt }
    await sendMessage({ type: MSG.RELEASE_NOTES_MARK_SEEN, version: modal.version, seenAt })
  }
  render()
}

function renderSettingsPage() {
  const lang = normalizeLocale(state.settings.language) || 'en'
  const captureMode = state.settings.captureMode || 'auto'
  const languageOptions = [
    { value: 'en', label: t('language.english') },
    { value: 'pt-BR', label: t('language.portuguese') },
    { value: 'es', label: t('language.spanish') }
  ]
  const captureModeOptions = [
    { value: 'auto', label: t('fullapp.captureModeAuto'), description: t('fullapp.captureModeAutoDescription') },
    { value: 'cdp', label: t('fullapp.captureModeFull'), description: t('fullapp.captureModeFullDescription') },
    { value: 'compat', label: t('fullapp.captureModeLight'), description: t('fullapp.captureModeLightDescription') }
  ]
  const bodyHtml = `
      <div class="grid two">
        <div class="settings-field">
          <div class="muted">${t('language.title')}</div>
          ${renderSelect({ id: 'settings-language', value: lang, options: languageOptions })}
        </div>
        <div class="settings-field">
          <div class="muted">${t('fullapp.captureMode')}</div>
          ${renderSelect({ id: 'settings-capture-mode', value: captureMode, options: captureModeOptions })}
        </div>
        <div class="settings-field">
          <div class="muted">${t('fullapp.maxNetworkEntries')}</div>
          <input class="input" id="settings-max-network" type="number" value="${state.settings.maxNetworkEntries || 300}" />
        </div>
        <div class="settings-field">
          <div class="muted">${t('fullapp.maxLogs')}</div>
          <input class="input" id="settings-max-logs" type="number" value="${state.settings.maxLogs || 300}" />
        </div>
        <div class="settings-field settings-wide">
          <div class="muted">${t('fullapp.networkIgnorePatterns')}</div>
          <div class="tag-input" id="settings-network-ignore-tags">
            <div class="tag-chip-list" id="settings-network-ignore-chip-list">${renderNetworkIgnoreChips()}</div>
            <input class="tag-input-field" id="settings-network-ignore-input" type="text" placeholder="${escapeHtml(t('fullapp.networkIgnorePatternPlaceholder'))}" spellcheck="false" autocomplete="off" />
          </div>
          <div class="muted">${t('fullapp.networkIgnorePatternsHelp')}</div>
        </div>
        ${renderSwitch({ id: 'settings-auto-attach', checked: state.settings.autoAttach, label: t('fullapp.autoAttach'), className: 'settings-toggle' })}
        ${renderSwitch({ id: 'settings-auto-reload', checked: state.settings.autoReloadAfterRuleChange, label: t('fullapp.autoReloadAfterRuleChange'), className: 'settings-toggle' })}
      </div>
      ${renderAiBridgeSettingsSection(state.aiBridgeSession)}
  `

  return renderDataPanel({
    title: t('common.settings'),
    actionsHtml: renderButton({
      id: 'settings-save-btn',
      label: t('fullapp.saveSettings'),
      variant: 'primary',
      disabled: true,
      tooltip: t('fullapp.saveSettingsDisabled')
    }),
    bodyHtml,
    className: 'settings-panel'
  })
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
  const isSplitScrollPage = state.page === 'network' || state.page === 'logs' || state.page === 'rules' || state.page === 'collections' || state.page === 'diagnostics'
  const selectedLog = state.selectedLogId ? findLogById(state.selectedLogId) : null
  updateDocumentTitle()
  root.innerHTML = renderAppShell({
    sidebar: renderSidebar(state.page, { releaseNotes: getCurrentReleaseNotesMenuState() }),
    topbar: renderTopbar(state),
    content: renderPage(),
    contentClass: isSplitScrollPage ? 'app-content-split' : ''
  })
    + renderNetworkInspectorModal(state)
    + renderLogDetailModal({ log: selectedLog, prefix: 'full' })
    + renderRuleMoveModal({
      open: Boolean(state.ruleMoveModal),
      collections: state.collections,
      activeCollectionId: activeEditableCollectionId(),
      selectedCount: state.ruleMoveModal?.ruleIds?.length || 0
    })
    + renderReleaseNotesModal(state.releaseNotesModal || {})
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
  bindSelectMenus()
  bindEvents()
  restoreFocusSnapshot(focusSnapshot)
  updateDataPanelScrollState(root)
}

function bindTopbarEvents() {
  const startOrRestartCapture = async button => {
    const buttonTabId = Number(button?.dataset.tabId || 0) || null
    const preferredTabId = buttonTabId || state.compatActiveTab?.id || state.attachedTab?.id || state.candidateTab?.id || state.lastAttachableTab?.id || null
    const result = await sendMessage({
      type: MSG.DEBUG_ATTACH,
      tabId: preferredTabId
    })
    if (result?.error) {
      toastError(translateBackendError(result.error), backendErrorDuration(result.error))
      return
    }
    await refreshState()
  }
  $('#full-attach-btn')?.addEventListener('click', event => startOrRestartCapture(event.currentTarget))
  $('#full-attach-new-tab-btn')?.addEventListener('click', event => startOrRestartCapture(event.currentTarget))
  $('#full-detach-btn')?.addEventListener('click', async () => {
    const button = $('#full-detach-btn')
    const targetTabId = Number(button?.dataset.tabId || 0) || state.compatActiveTab?.id || state.attachedTab?.id || null
    await sendMessage({ type: MSG.DEBUG_DETACH, tabId: targetTabId })
    await refreshState()
  })
  $('#full-open-auto-attach-settings')?.addEventListener('click', () => {
    openFullPage('settings')
  })
  $('#full-capture-mode-settings')?.addEventListener('click', () => {
    openFullPage('settings')
  })
  $('#full-reload-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.TAB_RELOAD })
    if (result?.error) toastError(translateBackendError(result.error))
  })
  $('#full-focus-tab-btn')?.addEventListener('click', async () => {
    const targetTabId = state.attachedTab?.id || state.compatActiveTab?.id || state.candidateTab?.id || state.lastAttachableTab?.id || null
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
    || (current.networkMeta?.currentCaptureSessionId ?? null) !== (next.networkMeta?.currentCaptureSessionId ?? null)
}

let pendingConnectionPatch = null
const flushConnectionUpdate = debounce(() => {
  if (!pendingConnectionPatch) return
  const patch = pendingConnectionPatch
  pendingConnectionPatch = null

  const current = {
    attachedTabId: state.attachedTabId ?? null,
    attachedTab: state.attachedTab ?? null,
    compatActiveTab: state.compatActiveTab ?? null,
    activeTab: state.activeTab ?? null,
    candidateTab: state.candidateTab ?? null,
    lastAttachableTab: state.lastAttachableTab ?? null,
    compatActiveTabId: state.compatActiveTabId ?? null,
    networkMeta: state.networkMeta ?? null
  }
  const next = mergeConnectionState(current, patch)

  const changed = connectionChanged(current, next)
  state.attachedTabId = next.attachedTabId
  state.attachedTab = next.attachedTab
  state.compatActiveTab = next.compatActiveTab
  state.activeTab = next.activeTab
  state.candidateTab = next.candidateTab
  state.lastAttachableTab = next.lastAttachableTab
  state.compatActiveTabId = next.compatActiveTabId
  state.networkMeta = next.networkMeta

  if (!changed) return
  if (state.page === 'network' || state.page === 'logs' || state.page === 'dashboard') {
    applyLocalFilters()
    render()
    return
  }
  refreshTopbarOnly()
}, 120)

function queueConnectionPatch(patch) {
  pendingConnectionPatch = { ...(pendingConnectionPatch || {}), ...patch }
  flushConnectionUpdate()
}

function openInspector(entryId) {
  const entry = ensureNetworkEntryAvailable(entryId)
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
    const entry = findNetworkEntryById(state.inspector.entryId)
    if (entry && entry.responseBodyLoaded === 'idle' && !expectsNoBody(entry)) {
      loadInspectorBody()
    }
  }
}

async function loadInspectorBody() {
  if (!state.inspector) return
  const entryId = state.inspector.entryId
  const entry = findNetworkEntryById(entryId)
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
  const entry = findNetworkEntryById(state.inspector.entryId)
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

async function importRuleBundle(bundle) {
  if (!bundle?.rule) {
    toastError(t('toasts.ruleImportError'))
    return false
  }
  const activeCollectionId = activeEditableCollectionId()
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
    return false
  }
  toastSuccess(t('toasts.ruleImported'))
  await refreshState()
  return true
}

function buildImportedRulePayload(rule, overrides = {}) {
  return {
    ...rule,
    ...overrides,
    action: {
      ...rule.action,
      applyResponseBody: rule.action?.applyResponseBody ?? true,
      applyResponseHeaders: rule.action?.applyResponseHeaders ?? false
    }
  }
}

async function importCollectionBundleAsCopy(bundle) {
  if (!bundle?.collection || !Array.isArray(bundle.rules)) {
    toastError(t('toasts.collectionImportError'))
    return false
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
    return false
  }

  const usedNames = []
  for (const rule of bundle.rules) {
    const ruleName = getUniqueName(rule.name, usedNames)
    usedNames.push(ruleName)
    const rulePayload = buildImportedRulePayload(rule, {
      id: null,
      collectionId: collectionPayload.id,
      name: ruleName
    })
    await sendMessage({ type: MSG.RULES_CREATE, payload: rulePayload })
  }
  toastSuccess(t('toasts.collectionImported'))
  await refreshState()
  return true
}

async function importCollectionBundleAsUpdate(bundle, existingCollection) {
  if (!existingCollection || !bundle?.collection || !Array.isArray(bundle.rules)) {
    toastError(t('toasts.collectionImportError'))
    return false
  }

  const result = await sendMessage({
    type: MSG.COLLECTIONS_REPLACE_CONTENTS,
    payload: {
      ...existingCollection,
      name: bundle.collection.name,
      description: bundle.collection.description,
      enabled: bundle.collection.enabled !== false
    },
    rules: bundle.rules.map(rule => buildImportedRulePayload(rule, {
      collectionId: existingCollection.id
    }))
  })

  if (result?.error) {
    toastError(t('toasts.collectionImportError'))
    return false
  }

  toastSuccess(t('toasts.collectionUpdated'))
  await refreshState()
  return true
}

async function chooseCollectionImportStrategy(existingCollection) {
  if (!existingCollection) return 'copy'
  return choiceDialog({
    title: t('fullapp.importConflictTitle'),
    message: t('fullapp.importConflictMessage', { name: existingCollection.name }),
    cancelLabel: t('common.cancel'),
    actions: [
      {
        label: t('fullapp.importConflictCopy'),
        value: 'copy'
      },
      {
        label: t('fullapp.importConflictUpdate'),
        value: 'update',
        variant: 'primary'
      }
    ]
  })
}

async function importCollectionBundle(bundle) {
  const existingCollection = findCollectionConflictById(bundle, state.collections)
  const strategy = await chooseCollectionImportStrategy(existingCollection)
  if (!strategy) return false
  if (strategy === 'update') return importCollectionBundleAsUpdate(bundle, existingCollection)
  return importCollectionBundleAsCopy(bundle)
}

async function importParsedBundle(bundle) {
  if (bundle.type === BUNDLE_TYPE_RULE) {
    return importRuleBundle(bundle)
  }
  if (bundle.type === BUNDLE_TYPE_COLLECTION) {
    return importCollectionBundle(bundle)
  }
  toastError(t('toasts.unsupportedType'))
  return false
}

async function importBundleFromText(raw) {
  const parsed = parseImportBundle(raw, {
    schemaVersion: SCHEMA_VERSION,
    ruleType: BUNDLE_TYPE_RULE,
    collectionType: BUNDLE_TYPE_COLLECTION
  })
  if (parsed.error === 'invalidJson') {
    toastError(t('toasts.invalidJson'))
    return false
  }
  if (parsed.error) {
    toastError(t('toasts.unsupportedType'))
    return false
  }
  return importParsedBundle(parsed.bundle)
}

async function cancelAiBridgePendingImport() {
  const pendingImportId = state.aiBridgePendingImport?.id || ''
  if (!pendingImportId) return

  const result = await sendMessage({
    type: MSG.AI_BRIDGE_CANCEL_PENDING_IMPORT,
    pendingImportId
  })
  if (result?.error) {
    toastError(translateBackendError(result.error.code || result.error.message || result.error))
    return
  }

  state.aiBridgePendingImport = result.pendingImport || null
  toastSuccess(t('toasts.aiImportCanceled'))
  render()
}

async function confirmAiBridgePendingImport() {
  const pendingImport = state.aiBridgePendingImport
  if (!pendingImport?.id || !pendingImport.bundle) {
    toastError(t('toasts.aiImportMissing'))
    return
  }

  const ok = await importParsedBundle(pendingImport.bundle)
  if (!ok) return

  const result = await sendMessage({
    type: MSG.AI_BRIDGE_CONFIRM_PENDING_IMPORT,
    pendingImportId: pendingImport.id
  })
  if (result?.error) {
    toastError(translateBackendError(result.error.code || result.error.message || result.error))
    return
  }

  state.aiBridgePendingImport = result.pendingImport || null
  toastSuccess(t('toasts.aiImportConfirmed'))
  render()
}

async function handleImportTemplateAction(action) {
  try {
    if (action === 'copy-collection') {
      await copyJsonToClipboard(buildCollectionTemplate(t))
      toastSuccess(t('toasts.templateCopied'))
      return
    }
    if (action === 'copy-rule') {
      await copyJsonToClipboard(buildRuleTemplate(t))
      toastSuccess(t('toasts.templateCopied'))
      return
    }
    if (action === 'download-collection') {
      downloadJsonFile(buildCollectionTemplate(t), 'interceptpilot-template.json')
      toastSuccess(t('toasts.templateDownloaded'))
      return
    }
    if (action === 'download-rule') {
      downloadJsonFile(buildRuleTemplate(t), 'interceptpilot-rule-template.json')
      toastSuccess(t('toasts.templateDownloaded'))
      return
    }
    if (action === 'copy-ai-prompt') {
      await copyTextToClipboard(getAiPrompt(t))
      toastSuccess(t('toasts.aiPromptCopied'))
    }
  } catch {
    toastError(t('toasts.copyError'))
  }
}

function bindImportTemplateMenuEvents() {
  const menu = $('#full-import-templates-menu')
  if (!menu) return

  const closeMenu = event => {
    const target = event.target instanceof Node ? event.target : null
    if (target && menu.contains(target)) return
    menu.open = false
    document.removeEventListener('click', closeMenu, true)
  }

  document.querySelectorAll('[data-import-template-action]').forEach(button => {
    button.addEventListener('click', () => {
      menu.open = false
      document.removeEventListener('click', closeMenu, true)
      handleImportTemplateAction(button.dataset.importTemplateAction)
    })
  })

  menu.addEventListener('toggle', () => {
    if (menu.open) {
      requestAnimationFrame(() => document.addEventListener('click', closeMenu, true))
      return
    }
    document.removeEventListener('click', closeMenu, true)
  })
}

function bindCreateRuleFromRequestEvents() {
  const table = $('#full-network-table')
  if (!table || table.dataset.boundRows === 'true') return
  table.dataset.boundRows = 'true'

  delegate(table, 'click', '[data-full-create-from-request]', async ({ event, delegateTarget: button }) => {
    event.stopPropagation()
    await createRuleFromNetworkEntry(button.dataset.fullCreateFromRequest)
  })

  delegate(table, 'click', '[data-entry-id]', ({ target, delegateTarget: row }) => {
    if (target.closest('[data-full-create-from-request]')) return
    openInspector(row.dataset.entryId)
  })
}

function patchNetworkTableOnly() {
  if (state.page !== 'network') return
  const table = $('#full-network-table')
  if (!table) return
  patchHtml(table, renderNetworkRows(state))
  const header = $('#full-network-table-header')
  if (header) {
    header.hidden = !(state.pagedNetworkEntries || state.filteredNetworkEntries || state.networkEntries).some(isRenderableNetworkEntry)
  }
  const footerHtml = renderNetworkFooter(state)
  const paginationEl = $('#full-network-pagination')
  if (paginationEl) {
    patchHtml(paginationEl, footerHtml)
  } else if (footerHtml) {
    render()
    return
  }
  bindCreateRuleFromRequestEvents()
  bindNetworkPaginationEvents()
  updateDataPanelScrollStateSoon()
}

function refreshNetworkTableOnly({ defer = false } = {}) {
  if (defer) {
    fullNetworkUpdateGuard.run(patchNetworkTableOnly)
    return
  }
  patchNetworkTableOnly()
}

function bindNetworkPaginationEvents() {
  const container = $('#full-network-pagination')
  if (!container || container.dataset.bound === 'true') return
  container.dataset.bound = 'true'
  delegate(container, 'click', '[data-full-network-page]', ({ delegateTarget: button }) => {
    const direction = button.dataset.fullNetworkPage
    const current = Number(state.networkPagination?.page || 1)
    state.networkPagination = {
      ...(state.networkPagination || {}),
      page: direction === 'next' ? current + 1 : current - 1
    }
    applyNetworkPagination()
    refreshNetworkTableOnly()
  })
}

async function createRuleFromNetworkEntry(entryId) {
  const result = await sendMessage({ type: MSG.RULE_CREATE_FROM_REQUEST, entryId })
  if (result?.error) return toastError(result.error || t('rules.createFromRequestError'))
  setCurrentPage('rules', { renderPage: false })
  state.editingRule = result.createdRule || null
  state.editorMode = 'create'
  state.editorPristine = true
  await refreshState()
}

function patchLogsTableOnly() {
  if (state.page !== 'logs') return
  const table = $('#full-logs-table')
  if (!table) return
  patchHtml(table, renderLogsRows(state))
  const header = $('#full-logs-table-header')
  if (header) header.hidden = !(state.pagedLogs || []).length
  const footer = $('#full-logs-pagination')
  if (footer) patchHtml(footer, renderLogsFooter(state))
  bindLogsEvents()
  updateDataPanelScrollStateSoon()
}

function refreshLogsTableOnly({ defer = false } = {}) {
  if (defer) {
    fullLogsUpdateGuard.run(patchLogsTableOnly)
    return
  }
  patchLogsTableOnly()
}

function getEventElement(event) {
  const target = event?.target
  if (target instanceof Element) return target
  return target?.parentElement || null
}

function samePressIntent(a, b) {
  return Boolean(a && b && a.kind === b.kind && a.id === b.id)
}

function isPointerReleaseInside(selector, event) {
  const panel = document.querySelector(selector)
  if (!panel) return false
  const x = Number(event?.clientX)
  const y = Number(event?.clientY)
  if (Number.isFinite(x) && Number.isFinite(y)) {
    const rect = panel.getBoundingClientRect()
    return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
  }
  const target = getEventElement(event)
  return Boolean(target && panel.contains(target))
}

function readNetworkPressIntent(event) {
  if (state.page !== 'network') return null
  const target = getEventElement(event)
  const panel = document.querySelector('.network-data-panel')
  if (!target || !panel || !panel.contains(target)) return null
  const createButton = target.closest('[data-full-create-from-request]')
  if (createButton && panel.contains(createButton)) {
    return { kind: 'network-create', id: createButton.dataset.fullCreateFromRequest }
  }
  const row = target.closest('[data-entry-id]')
  if (!row || !panel.contains(row)) return null
  return { kind: 'network-inspect', id: row.dataset.entryId }
}

function runNetworkPressIntent(intent) {
  if (!intent?.id) return
  if (intent.kind === 'network-create') {
    createRuleFromNetworkEntry(intent.id)
    return
  }
  if (intent.kind === 'network-inspect') {
    openInspector(intent.id)
  }
}

function clearPendingNetworkPress() {
  if (pendingNetworkPressTimer) clearTimeout(pendingNetworkPressTimer)
  pendingNetworkPressTimer = null
  pendingNetworkPress = null
}

function readLogPressIntent(event) {
  if (state.page !== 'logs') return null
  const target = getEventElement(event)
  const panel = document.querySelector('.logs-data-panel')
  if (!target || !panel || !panel.contains(target)) return null
  const row = target.closest('[data-full-log-detail]')
  if (!row || !panel.contains(row)) return null
  return { kind: 'log-detail', id: row.dataset.fullLogDetail, log: readLogSnapshotFromRow(row) }
}

function runLogPressIntent(intent) {
  if (intent?.kind === 'log-detail' && intent.id) openLogDetail(intent.id, intent.log)
}

function clearPendingLogPress() {
  if (pendingLogPressTimer) clearTimeout(pendingLogPressTimer)
  pendingLogPressTimer = null
  pendingLogPress = null
}

function findLogById(logId) {
  return (state.visibleLogs || []).find(log => log.id === logId)
    || (state.filteredLogs || []).find(log => log.id === logId)
    || (state.pagedLogs || []).find(log => log.id === logId)
    || logDetailCache.get(logId)
    || null
}

function readLogSnapshotFromRow(row) {
  if (!row?.dataset?.fullLogDetail) return null
  const cells = Array.from(row.children || []).map(cell => cell.textContent.trim())
  const levelText = (cells[1] || '').toLowerCase()
  const errorLabel = t('logs.levels.error').toLowerCase()
  const warnLabel = t('logs.levels.warn').toLowerCase()
  const level = levelText === errorLabel ? 'error' : levelText === warnLabel ? 'warn' : 'info'
  const url = cells[3] && cells[3] !== '—' ? cells[3] : ''
  return {
    id: row.dataset.fullLogDetail,
    scope: 'web',
    level,
    message: cells[0] || '',
    timestamp: cells[2] || '',
    url
  }
}

function openLogDetail(logId, fallbackLog = null) {
  if (fallbackLog?.id === logId) rememberLogDetails([fallbackLog])
  if (!findLogById(logId)) return
  state.selectedLogId = logId
  render()
}

function closeLogDetail() {
  state.selectedLogId = null
  render()
}

async function copySelectedLogField(field) {
  const log = findLogById(state.selectedLogId)
  if (!log) return
  const value = field === 'message'
    ? log.message
    : field === 'url'
      ? log.url
      : JSON.stringify(log, null, 2)
  if (!value) return
  try {
    await copyTextToClipboard(value)
    toastSuccess(t(`toasts.${field === 'message' ? 'logMessageCopied' : field === 'url' ? 'logUrlCopied' : 'logCopied'}`))
  } catch {
    toastError(t('toasts.copyError'))
  }
}

function bindLogsEvents() {
  const logsTable = document.querySelector('.logs-data-panel')
  if (logsTable && logsTable.dataset.logsBound !== 'true') {
    logsTable.dataset.logsBound = 'true'
    delegate(logsTable, 'click', '[data-full-log-detail]', ({ delegateTarget }) => {
      openLogDetail(delegateTarget.dataset.fullLogDetail, readLogSnapshotFromRow(delegateTarget))
    })
    delegate(logsTable, 'keydown', '[data-full-log-detail]', ({ event, delegateTarget }) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      event.preventDefault()
      openLogDetail(delegateTarget.dataset.fullLogDetail, readLogSnapshotFromRow(delegateTarget))
    })
  }

  const pagination = $('#full-logs-pagination')
  if (pagination && pagination.dataset.bound !== 'true') {
    pagination.dataset.bound = 'true'
    delegate(pagination, 'click', '[data-full-logs-page]', ({ delegateTarget: button }) => {
      const direction = button.dataset.fullLogsPage
      const current = Number(state.logsPagination?.page || 1)
      state.logsPagination = {
        ...(state.logsPagination || {}),
        page: direction === 'next' ? current + 1 : current - 1
      }
      applyLogsPagination()
      render()
    })
  }

  document.querySelector('[data-log-detail-backdrop="full"]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeLogDetail()
  })
  $('#full-log-detail-close')?.addEventListener('click', closeLogDetail)
  $('#full-log-detail-close-x')?.addEventListener('click', closeLogDetail)
  document.querySelectorAll('[data-full-log-copy]').forEach(button => {
    button.addEventListener('click', () => copySelectedLogField(button.dataset.fullLogCopy))
  })
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

function openFullPage(page) {
  if (page === 'release-notes') {
    openReleaseNotes(true)
    return
  }
  setCurrentPage(page)
}

function activeEditableCollectionId() {
  const selectableCollections = state.collections.filter(collection => collection.enabled !== false)
  const preferredCollectionId = state.settings?.activeCollectionId
  if (selectableCollections.some(collection => collection.id === preferredCollectionId)) return preferredCollectionId
  return selectableCollections[0]?.id || ''
}

function getSelectedFullRuleIds() {
  return [...document.querySelectorAll('[data-full-rule-select]:checked')]
    .map(input => input.dataset.fullRuleSelect)
    .filter(Boolean)
}

function closeRuleMoveModal() {
  state.ruleMoveModal = null
  render()
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => openFullPage(button.dataset.page)))
  bindTopbarEvents()

  function formatSelectionLabel(count, entityOne, entityMany) {
    const entity = count === 1 ? entityOne : entityMany
    const selectedWord = count === 1 ? t('common.selectedOne') : t('common.selectedMany')
    return `${count} ${entity} ${selectedWord}`
  }

  function updateSelectionBar({
    itemSelector,
    allSelector,
    barSelector,
    deleteButtonSelector,
    entityOne,
    entityMany
  }) {
    const inputs = [...document.querySelectorAll(itemSelector)]
    const selected = inputs.filter(input => input.checked)
    const bar = $(barSelector)
    const deleteButton = $(deleteButtonSelector)
    const label = bar?.querySelector('[data-floating-selection-label]')
    const hasSelection = selected.length > 0

    inputs.forEach(input => {
      input.closest('.table-row')?.classList.toggle('is-selected', input.checked)
    })

    if (bar) {
      bar.hidden = !hasSelection
      bar.classList.toggle('is-visible', hasSelection)
      bar.closest('.data-panel')?.classList.toggle('has-selection', hasSelection)
    }
    if (label) label.textContent = formatSelectionLabel(selected.length, entityOne, entityMany)
    if (deleteButton) deleteButton.disabled = !hasSelection
    if (bar) {
      bar.querySelectorAll('.floating-selection-bar__button').forEach(button => {
        button.disabled = !hasSelection
      })
    }

    const all = $(allSelector)
    if (all) {
      all.checked = inputs.length > 0 && selected.length === inputs.length
      all.indeterminate = selected.length > 0 && selected.length < inputs.length
      all.disabled = inputs.length === 0
    }
  }

  const updateRulesBulkDelete = () => updateSelectionBar({
    itemSelector: '[data-full-rule-select]',
    allSelector: '#full-rules-select-all',
    barSelector: '#full-rules-selection-bar',
    deleteButtonSelector: '#full-delete-selected-rules-btn',
    entityOne: t('rules.entityOne'),
    entityMany: t('rules.entityMany')
  })

  const updateCollectionsBulkDelete = () => updateSelectionBar({
    itemSelector: '[data-full-collection-select]:not(:disabled)',
    allSelector: '#full-collections-select-all',
    barSelector: '#full-collections-selection-bar',
    deleteButtonSelector: '#full-delete-selected-collections-btn',
    entityOne: t('collections.entityOne'),
    entityMany: t('collections.entityMany')
  })

  $('#full-rules-select-all')?.addEventListener('change', event => {
    document.querySelectorAll('[data-full-rule-select]').forEach(input => {
      input.checked = event.target.checked
    })
    updateRulesBulkDelete()
  })

  document.querySelectorAll('[data-full-rule-select]').forEach(input => {
    input.addEventListener('change', updateRulesBulkDelete)
  })

  $('#full-clear-selected-rules-btn')?.addEventListener('click', () => {
    document.querySelectorAll('[data-full-rule-select]').forEach(input => {
      input.checked = false
    })
    updateRulesBulkDelete()
  })

  $('#full-delete-selected-rules-btn')?.addEventListener('click', async () => {
    const ruleIds = getSelectedFullRuleIds()
    if (!ruleIds.length) return
    const copy = getBulkDeleteDialogCopy('rules', ruleIds.length)
    const ok = await confirmDialog({
      title: copy.title,
      message: copy.message,
      confirmLabel: copy.confirmLabel,
      cancelLabel: t('common.cancel'),
      danger: true
    })
    if (!ok) return
    await sendMessage({ type: MSG.RULES_DELETE_MANY, ruleIds })
    if (state.editingRule && ruleIds.includes(state.editingRule.id)) state.editingRule = null
    toastSuccess(getBulkDeleteSuccessMessage('rules', ruleIds.length))
    await refreshState()
  })

  $('#full-move-selected-rules-btn')?.addEventListener('click', () => {
    const ruleIds = getSelectedFullRuleIds()
    if (!ruleIds.length) return
    const currentCollectionId = activeEditableCollectionId()
    const hasDestination = state.collections.some(collection => collection.enabled !== false && collection.id !== currentCollectionId)
    if (!hasDestination) {
      toastError(t('rules.moveNoDestination'))
      return
    }
    state.ruleMoveModal = { ruleIds }
    render()
  })

  $('#full-move-rules-cancel')?.addEventListener('click', closeRuleMoveModal)
  $('#full-move-rules-close')?.addEventListener('click', closeRuleMoveModal)
  document.querySelector('[data-rule-move-backdrop]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeRuleMoveModal()
  })
  $('#full-move-rules-confirm')?.addEventListener('click', async () => {
    const ruleIds = state.ruleMoveModal?.ruleIds || []
    const collectionId = $('#full-move-rules-target')?.value || ''
    if (!ruleIds.length || !collectionId) return
    const result = await sendMessage({ type: MSG.RULES_MOVE, ruleIds, collectionId })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    if (state.editingRule && ruleIds.includes(state.editingRule.id)) state.editingRule = null
    state.ruleMoveModal = null
    toastSuccess(t(ruleIds.length === 1 ? 'rules.moveSelectedSuccessOne' : 'rules.moveSelectedSuccessMany', { count: ruleIds.length }))
    await refreshState()
  })

  $('#full-collections-select-all')?.addEventListener('change', event => {
    document.querySelectorAll('[data-full-collection-select]:not(:disabled)').forEach(input => {
      input.checked = event.target.checked
    })
    updateCollectionsBulkDelete()
  })

  document.querySelectorAll('[data-full-collection-select]').forEach(input => {
    input.addEventListener('change', updateCollectionsBulkDelete)
  })

  $('#full-clear-selected-collections-btn')?.addEventListener('click', () => {
    document.querySelectorAll('[data-full-collection-select]:not(:disabled)').forEach(input => {
      input.checked = false
    })
    updateCollectionsBulkDelete()
  })

  $('#full-delete-selected-collections-btn')?.addEventListener('click', async () => {
    const collectionIds = [...document.querySelectorAll('[data-full-collection-select]:checked')]
      .map(input => input.dataset.fullCollectionSelect)
      .filter(Boolean)
    if (!collectionIds.length) return
    const copy = getBulkDeleteDialogCopy('collections', collectionIds.length)
    const ok = await confirmDialog({
      title: copy.title,
      message: copy.message,
      confirmLabel: copy.confirmLabel,
      cancelLabel: t('common.cancel'),
      danger: true
    })
    if (!ok) return
    await sendMessage({ type: MSG.COLLECTIONS_DELETE_MANY, collectionIds })
    toastSuccess(getBulkDeleteSuccessMessage('collections', collectionIds.length))
    await refreshState()
  })

  updateRulesBulkDelete()
  updateCollectionsBulkDelete()

  $('#full-rules-collection')?.addEventListener('change', async event => {
    if (!event.target.value) return
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
    const collectionId = activeEditableCollectionId()
    state.editingRule = makeRule({ collectionId }, collectionId)
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
  if (state.editingRule) {
    document.querySelector('[data-modal-backdrop]')?.addEventListener('click', event => {
      if (event.target === event.currentTarget) closeEditor()
    })
  }

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
      const collectionId = button.dataset.fullCollectionDelete
      const collection = state.collections.find(item => item.id === collectionId)
      const ok = await confirmDialog({
        title: t('collections.deleteTitle'),
        message: t('collections.deleteConfirm', { name: collection?.name || t('collections.defaultName') }),
        confirmLabel: t('common.delete'),
        cancelLabel: t('common.cancel'),
        danger: true
      })
      if (!ok) return
      await sendMessage({ type: MSG.COLLECTIONS_DELETE, collectionId })
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

  $('#full-network-url')?.addEventListener('input', event => {
    state.networkFilter.url = event.target.value
    resetNetworkPage()
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-method')?.addEventListener('change', event => {
    state.networkFilter.method = event.target.value
    resetNetworkPage()
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-status')?.addEventListener('input', event => {
    state.networkFilter.status = event.target.value
    resetNetworkPage()
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-intercepted')?.addEventListener('change', event => {
    state.networkFilter.interceptedOnly = event.target.checked
    resetNetworkPage()
    applyLocalFilters()
    refreshNetworkTableOnly()
    persistFullAppNetworkFilter()
  })
  $('#full-network-clear')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.NETWORK_CLEAR })
    state.selectedNetworkEntryId = null
    state.inspector = null
    resetNetworkPage()
    await refreshState()
  })

  bindCreateRuleFromRequestEvents()
  bindNetworkPaginationEvents()

  $('#full-logs-level')?.addEventListener('change', event => {
    state.logsFilter.level = event.target.value
    resetLogsPage()
    applyLocalFilters()
    render()
  })
  $('#full-logs-search')?.addEventListener('input', event => {
    state.logsFilter.search = event.target.value
    resetLogsPage()
    applyLocalFilters()
    render()
  })
  $('#full-clear-logs')?.addEventListener('click', async () => {
    await sendMessage({ type: MSG.LOGS_CLEAR })
    state.selectedLogId = null
    resetLogsPage()
    await refreshState()
  })
  bindLogsEvents()

  const importTextarea = $('#full-import-json')
  importTextarea?.addEventListener('input', updateImportJsonButtonState)
  updateImportJsonButtonState()

  const importDropzone = $('#full-import-dropzone')
  if (importDropzone) {
    const activateDropzoneEvents = ['dragenter', 'dragover']
    const clearDropzoneEvents = ['dragleave', 'drop']
    activateDropzoneEvents.forEach(type => {
      importDropzone.addEventListener(type, event => {
        event.preventDefault()
        setImportDropzoneActive(true)
      })
    })
    clearDropzoneEvents.forEach(type => {
      importDropzone.addEventListener(type, () => setImportDropzoneActive(false))
    })
    importDropzone.addEventListener('drop', async event => {
      event.preventDefault()
      const files = [...(event.dataTransfer?.files || [])]
      if (!files.length) return
      if (files.length > 1) {
        toastError(t('toasts.importOneFileOnly'))
        return
      }
      const file = files[0]
      if (!isJsonImportFile(file)) {
        toastError(t('toasts.importUnsupportedFile'))
        return
      }
      await prepareImportFile(file)
    })
  }

  $('#full-import-json-btn')?.addEventListener('click', async () => {
    const textarea = $('#full-import-json')
    const raw = textarea?.value || ''
    if (!raw.trim()) return
    const ok = await importBundleFromText(raw)
    if (ok && textarea) {
      textarea.value = ''
      updateImportJsonButtonState()
    }
  })

  $('#full-import-pick-file-btn')?.addEventListener('click', () => {
    $('#full-import-file-input')?.click()
  })

  $('#full-import-file-input')?.addEventListener('change', async event => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      if (!isJsonImportFile(file)) {
        event.target.value = ''
        toastError(t('toasts.importUnsupportedFile'))
        return
      }
      const text = await file.text()
      event.target.value = ''
      await importBundleFromText(text)
    } catch {
      toastError(t('toasts.importError'))
    }
  })

  $('#full-ai-import-cancel-btn')?.addEventListener('click', cancelAiBridgePendingImport)
  $('#full-ai-import-confirm-btn')?.addEventListener('click', confirmAiBridgePendingImport)

  bindImportTemplateMenuEvents()

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
        setCurrentPage('rules', { renderPage: false })
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

  const settingsBaseline = normalizeSettingsSnapshot(state.settings)
  const updateSettingsSaveState = () => setSettingsSaveEnabled(!settingsSnapshotsEqual(settingsBaseline, readSettingsFormPayload()))
  document.querySelectorAll('#settings-language, #settings-capture-mode, #settings-max-network, #settings-max-logs, #settings-auto-attach, #settings-auto-reload')
    .forEach(input => {
      input.addEventListener('input', updateSettingsSaveState)
      input.addEventListener('change', updateSettingsSaveState)
    })

  const ignoreInput = $('#settings-network-ignore-input')
  ignoreInput?.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ';') {
      event.preventDefault()
      addNetworkIgnorePatterns(ignoreInput.value)
      ignoreInput.value = ''
      updateSettingsSaveState()
      return
    }
    if (event.key === 'Backspace' && !ignoreInput.value) {
      const current = parseNetworkIgnorePatterns(state.settings.networkIgnorePatterns)
      if (!current.length) return
      current.pop()
      setNetworkIgnorePatterns(current)
      refreshNetworkIgnoreChips()
      updateSettingsSaveState()
    }
  })
  ignoreInput?.addEventListener('input', () => {
    if (!ignoreInput.value.includes(';')) {
      updateSettingsSaveState()
      return
    }
    addNetworkIgnorePatterns(ignoreInput.value)
    ignoreInput.value = ''
    updateSettingsSaveState()
  })
  ignoreInput?.addEventListener('paste', event => {
    const text = event.clipboardData?.getData('text') || ''
    if (!text.includes(';')) return
    event.preventDefault()
    addNetworkIgnorePatterns(text)
    ignoreInput.value = ''
    updateSettingsSaveState()
  })

  $('#settings-network-ignore-tags')?.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null
    const removeButton = target?.closest('[data-network-ignore-remove]')
    if (removeButton) {
      removeNetworkIgnorePattern(removeButton.dataset.networkIgnoreRemove)
      updateSettingsSaveState()
      return
    }
    ignoreInput?.focus()
  })
  updateSettingsSaveState()

  $('#settings-save-btn')?.addEventListener('click', async () => {
    const payload = readSettingsFormPayload()
    const result = await sendMessage({ type: MSG.SETTINGS_UPDATE, payload })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    setLocale(payload.language)
    await refreshState()
    toastSuccess(t('fullapp.settingsSaved'))
  })

  $('#settings-ai-bridge-start-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.AI_BRIDGE_START_SESSION })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    state.aiBridgeSession = result.aiBridgeSession || createAiBridgeSessionState()
    render()
  })

  $('#settings-ai-bridge-revoke-btn')?.addEventListener('click', async () => {
    const result = await sendMessage({ type: MSG.AI_BRIDGE_REVOKE_SESSION })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    state.aiBridgeSession = result.aiBridgeSession || createAiBridgeSessionState()
    render()
  })

  $('#settings-ai-bridge-copy-config-btn')?.addEventListener('click', async () => {
    const configText = buildAiBridgeMcpConfigText(state.aiBridgeSession)
    if (!configText) return
    try {
      await copyTextToClipboard(configText)
      toastSuccess(t('toasts.aiBridgeConfigCopied'))
    } catch {
      toastError(t('toasts.copyError'))
    }
  })

  $('#release-notes-close')?.addEventListener('click', closeReleaseNotes)
  $('#release-notes-close-x')?.addEventListener('click', closeReleaseNotes)
  document.querySelector('[data-release-notes-modal="true"]')?.addEventListener('click', event => {
    if (event.target === event.currentTarget) closeReleaseNotes()
  })
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state:network') {
    state.networkEntries = message.networkEntries
    state.networkMeta = message.networkMeta || state.networkMeta
    if (state.page === 'network') {
      applyLocalFilters()
      refreshNetworkTableOnly({ defer: true })
    }
    if (state.inspector) {
      const entry = findNetworkEntryById(state.inspector.entryId)
      if (entry) refreshInspectorBodyOnly()
      else closeInspector()
    }
  }
  if (message?.type === 'state:logs') {
    state.logs = message.logs
    if (state.page === 'logs' || state.page === 'diagnostics') {
      applyLocalFilters()
      if (state.selectedLogId && !findLogById(state.selectedLogId)) {
        state.selectedLogId = null
        render()
        return
      }
      if (state.page === 'logs') {
        refreshLogsTableOnly({ defer: true })
        return
      }
      render()
    }
  }
  if (message?.type === 'state:aiBridge') {
    state.aiBridgeSession = message.aiBridgeSession || createAiBridgeSessionState()
    if (state.page === 'settings') render()
  }
  if (message?.type === 'state:aiBridgeImport') {
    state.aiBridgePendingImport = message.pendingImport || null
    if (state.page === 'import-export') render()
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
      compatActiveTabId: message.compatActiveTabId ?? null,
      networkMeta: message.networkMeta ?? null
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
    && !changes[STORAGE_KEYS.releaseNotesLastSeenVersion]
    && !changes[STORAGE_KEYS.releaseNotesLastSeenAt]

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
  if (changes.settings || changes.collections || changes.rules || changes.logs || changes[STORAGE_KEYS.releaseNotesLastSeenVersion] || changes[STORAGE_KEYS.releaseNotesLastSeenAt]) {
    refreshState()
  }
})

document.addEventListener('pointerdown', event => {
  clearPendingNetworkPress()
  clearPendingLogPress()
  pendingNetworkPress = readNetworkPressIntent(event)
  pendingLogPress = readLogPressIntent(event)
}, true)

document.addEventListener('pointerup', event => {
  const networkIntent = pendingNetworkPress
  if (networkIntent) {
    if (!isPointerReleaseInside('.network-data-panel', event)) {
      clearPendingNetworkPress()
    } else {
      pendingNetworkPressTimer = setTimeout(() => {
        const intent = pendingNetworkPress
        clearPendingNetworkPress()
        runNetworkPressIntent(intent)
      }, 120)
    }
  }

  const logIntent = pendingLogPress
  if (logIntent) {
    if (!isPointerReleaseInside('.logs-data-panel', event)) {
      clearPendingLogPress()
    } else {
      pendingLogPressTimer = setTimeout(() => {
        const intent = pendingLogPress
        clearPendingLogPress()
        runLogPressIntent(intent)
      }, 120)
    }
  }
}, true)

document.addEventListener('pointercancel', () => {
  clearPendingNetworkPress()
  clearPendingLogPress()
}, true)

document.addEventListener('click', event => {
  const networkIntent = pendingNetworkPress
  if (networkIntent) {
    const clickIntent = readNetworkPressIntent(event)
    clearPendingNetworkPress()
    if (!samePressIntent(networkIntent, clickIntent)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      runNetworkPressIntent(networkIntent)
      return
    }
  }

  const logIntent = pendingLogPress
  if (logIntent) {
    const clickIntent = readLogPressIntent(event)
    clearPendingLogPress()
    if (!samePressIntent(logIntent, clickIntent)) {
      event.preventDefault()
      event.stopImmediatePropagation()
      runLogPressIntent(logIntent)
    }
  }
}, true)

document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return
  const importTemplatesMenu = $('#full-import-templates-menu')
  if (importTemplatesMenu?.open) {
    importTemplatesMenu.open = false
    return
  }
  if (state.inspector) {
    closeInspector()
    return
  }
  if (state.selectedLogId) {
    closeLogDetail()
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
  initTooltips()
  await refreshState()

  const params = new URLSearchParams(window.location.search)
  const editId = params.get('edit')
  const draft = params.get('draft')
  const targetPage = params.get('page')
  const filterUrl = params.get('filterUrl')
  const inspectId = params.get('inspect')

  if (editId) {
    const rule = state.rules.find(item => item.id === editId)
    if (rule) {
      setCurrentPage('rules', { renderPage: false })
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
        setCurrentPage('rules', { renderPage: false })
        state.editingRule = draftRule
        state.editorMode = 'create'
        state.editorPristine = true
        render()
        return
      }
    } catch {
      setCurrentPage('dashboard', { renderPage: false })
    }
  } else if (inspectId) {
    setCurrentPage('network', { renderPage: false })
    const entry = state.networkEntries.find(e => e.id === inspectId)
    if (entry) {
      state.selectedNetworkEntryId = inspectId
      state.inspector = { entryId: inspectId, tab: 'overview' }
    }
    render()
    return
  } else if (targetPage) {
    const page = normalizePageId(targetPage)
    setCurrentPage(page, { renderPage: false })
    if (page === 'network' && filterUrl) {
      state.networkFilter.url = filterUrl
      applyLocalFilters()
    }
    render()
    return
  }
  syncPageUrl()
  render()
}

bootstrap()
