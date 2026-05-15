const appState = {
  currentTab: 'rules',
  folders: [],
  rules: [],
  logs: [],
  networkEntries: [],
  activeTab: null,
  attachedTabId: null,
  attachBusy: false,
  rulesNotice: '',
  modal: {
    open: false,
    mode: 'info',
    title: '',
    message: '',
    value: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    resolve: null
  },
  filters: {
    text: '',
    excludeText: '',
    method: 'ANY',
    status: '',
    interceptedOnly: false,
    matchedOnly: false
  },
  form: null
}

const METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
const RESOURCE_TYPES = ['ANY', 'XHR', 'Fetch', 'Document', 'Script', 'Stylesheet', 'Image', 'Media', 'Font', 'Other']
const MATCH_TYPES = ['contains', 'equals', 'regex']
const ACTION_TYPES = ['mockResponse', 'failRequest', 'delayOnly', 'passThrough']
const FAIL_REASONS = ['Failed', 'Aborted', 'TimedOut', 'AccessDenied', 'ConnectionClosed', 'ConnectionRefused', 'ConnectionReset', 'InternetDisconnected', 'NameNotResolved']

function $(selector) {
  return document.querySelector(selector)
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function prettyJson(input) {
  try {
    return JSON.stringify(JSON.parse(input), null, 2)
  } catch {
    return input
  }
}

function defaultRuleForm(seed = {}) {
  return {
    id: seed.id || null,
    name: seed.name || '',
    enabled: seed.enabled !== false,
    folderId: seed.folderId || appState.folders[0]?.id || 'folder-default',
    priority: seed.priority || 0,
    match: {
      urlPattern: seed.match?.urlPattern || '',
      matchType: seed.match?.matchType || 'contains',
      method: seed.match?.method || 'ANY',
      resourceType: seed.match?.resourceType || 'ANY'
    },
    actionType: seed.actionType || 'mockResponse',
    action: {
      statusCode: seed.action?.statusCode || 200,
      statusText: seed.action?.statusText || 'OK',
      contentType: seed.action?.contentType || 'application/json',
      applyResponseHeaders: seed.action?.applyResponseHeaders === true,
      applyResponseBody: seed.action?.applyResponseBody !== false,
      responseBody: typeof seed.action?.responseBody === 'string'
        ? seed.action.responseBody
        : JSON.stringify(seed.action?.responseBody || { ok: true }, null, 2),
      responseHeadersText: Array.isArray(seed.action?.responseHeaders)
        ? seed.action.responseHeaders.map(header => `${header.name}: ${header.value}`).join('\n')
        : '',
      failReason: seed.action?.failReason || 'Failed',
      delayMs: seed.action?.delayMs || 0
    }
  }
}

function parseHeadersText(value) {
  return String(value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const index = line.indexOf(':')
      if (index === -1) return null
      return {
        name: line.slice(0, index).trim(),
        value: line.slice(index + 1).trim()
      }
    })
    .filter(Boolean)
}

function badgeForAction(actionType) {
  if (actionType === 'mockResponse') return '<span class="badge success" title="This rule returns a mocked response">mock response</span>'
  if (actionType === 'failRequest') return '<span class="badge danger">fail</span>'
  if (actionType === 'delayOnly') return '<span class="badge warning">delay</span>'
  return '<span class="badge">pass</span>'
}

function statusBadge(status) {
  if (status == null || status === '') return '<span class="badge">—</span>'
  if (Number(status) >= 400 || Number(status) === 0) return `<span class="badge danger">${status}</span>`
  if (Number(status) >= 300) return `<span class="badge warning">${status}</span>`
  return `<span class="badge success">${status}</span>`
}

function folderName(folderId) {
  return appState.folders.find(folder => folder.id === folderId)?.name || 'Unknown folder'
}

async function copyText(value) {
  const text = String(value ?? '')
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  return false
}

function openModal(config) {
  return new Promise(resolve => {
    appState.modal = {
      open: true,
      mode: config.mode || 'info',
      title: config.title || '',
      message: config.message || '',
      value: config.value || '',
      confirmText: config.confirmText || 'OK',
      cancelText: config.cancelText || 'Cancel',
      resolve
    }
    render()
  })
}

function closeModal(result = null) {
  const resolve = appState.modal.resolve
  appState.modal = {
    open: false,
    mode: 'info',
    title: '',
    message: '',
    value: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    resolve: null
  }
  render()
  if (typeof resolve === 'function') resolve(result)
}

function renderModal() {
  if (!appState.modal.open) return ''
  const isInput = appState.modal.mode === 'json-input'
  const isConfirm = appState.modal.mode === 'confirm'
  return `
    <div class="modal-backdrop">
      <div class="modal">
        <h3>${escapeHtml(appState.modal.title)}</h3>
        <p>${escapeHtml(appState.modal.message)}</p>
        ${isInput ? `<textarea class="textarea modal-textarea" id="modal-json-input">${escapeHtml(appState.modal.value)}</textarea>` : ''}
        <div class="modal-actions">
          ${(isInput || isConfirm) ? `<button class="btn ghost" id="modal-cancel-btn">${escapeHtml(appState.modal.cancelText)}</button>` : ''}
          <button class="btn primary" id="modal-confirm-btn">${escapeHtml(appState.modal.confirmText)}</button>
        </div>
      </div>
    </div>
  `
}

function validateImportedRule(candidate) {
  if (!candidate || typeof candidate !== 'object') return 'Invalid JSON object.'
  if (!candidate.name || typeof candidate.name !== 'string') return 'Missing "name".'
  if (!candidate.match || typeof candidate.match !== 'object') return 'Missing "match".'
  if (!candidate.match.urlPattern || typeof candidate.match.urlPattern !== 'string') return 'Missing "match.urlPattern".'
  if (!candidate.actionType || typeof candidate.actionType !== 'string') return 'Missing "actionType".'
  if (!candidate.action || typeof candidate.action !== 'object') return 'Missing "action".'
  return ''
}

async function sendMessage(message) {
  return chrome.runtime.sendMessage(message)
}

async function refreshState() {
  const next = await sendMessage({ type: 'state:get' })
  Object.assign(appState, next)
  if (!appState.form) appState.form = defaultRuleForm()
  render()
}

function setFormFromRule(rule) {
  appState.form = defaultRuleForm(rule)
  render()
}

function resetForm() {
  appState.form = defaultRuleForm()
  appState.rulesNotice = ''
  render()
}

async function saveRule() {
  const form = readRuleFormFromDom()
  if (!form.name.trim()) {
    alert('Rule name is required')
    return
  }
  if (!form.match.urlPattern.trim()) {
    alert('URL pattern is required')
    return
  }

  const payload = {
    id: form.id,
    name: form.name.trim(),
    enabled: form.enabled,
    folderId: form.folderId,
    priority: Number(form.priority || 0),
    match: form.match,
    actionType: form.actionType,
    action: {
      statusCode: Number(form.action.statusCode || 200),
      statusText: form.action.statusText || 'OK',
      contentType: form.action.contentType || 'application/json',
      applyResponseHeaders: form.action.applyResponseHeaders !== false,
      applyResponseBody: form.action.applyResponseBody !== false,
      responseBody: form.action.responseBody,
      responseHeaders: parseHeadersText(form.action.responseHeadersText),
      failReason: form.action.failReason || 'Failed',
      delayMs: Number(form.action.delayMs || 0)
    }
  }

  const message = payload.id
    ? { type: 'rules:update', payload }
    : { type: 'rules:create', payload }

  const result = await sendMessage(message)
  if (result.error) {
    alert(result.error)
    return
  }

  await refreshState()
  resetForm()
}

function readRuleFormFromDom() {
  return {
    id: $('#rule-id')?.value || null,
    name: $('#rule-name')?.value || '',
    enabled: $('#rule-enabled')?.checked ?? true,
    folderId: $('#rule-folder')?.value || appState.folders[0]?.id || 'folder-default',
    priority: Number($('#rule-priority')?.value || 0),
    match: {
      urlPattern: $('#rule-url-pattern')?.value || '',
      matchType: $('#rule-match-type')?.value || 'contains',
      method: $('#rule-method')?.value || 'ANY',
      resourceType: $('#rule-resource-type')?.value || 'ANY'
    },
    actionType: $('#rule-action-type')?.value || 'mockResponse',
    action: {
      statusCode: Number($('#rule-status-code')?.value || 200),
      statusText: $('#rule-status-text')?.value || 'OK',
      contentType: $('#rule-content-type')?.value || 'application/json',
      applyResponseHeaders: $('#rule-apply-response-headers')?.checked ?? false,
      applyResponseBody: $('#rule-apply-response-body')?.checked ?? true,
      responseBody: $('#rule-response-body')?.value || '{\n  "ok": true\n}',
      responseHeadersText: $('#rule-response-headers')?.value || '',
      failReason: $('#rule-fail-reason')?.value || 'Failed',
      delayMs: Number($('#rule-delay-ms')?.value || 0)
    }
  }
}

function filteredNetworkEntries() {
  const excludeTerms = appState.filters.excludeText
    .split(';')
    .map(term => term.trim().toLowerCase())
    .filter(Boolean)

  return appState.networkEntries.filter(entry => {
    if (appState.filters.interceptedOnly && !entry.intercepted) return false
    if (appState.filters.matchedOnly && !entry.matchedRuleId) return false
    if (appState.filters.method !== 'ANY' && entry.method !== appState.filters.method) return false
    if (appState.filters.status && String(entry.status || '') !== String(appState.filters.status)) return false

    const text = appState.filters.text.trim().toLowerCase()
    if (text) {
      const hay = `${entry.method} ${entry.url} ${entry.matchedRuleName || ''} ${entry.appliedAction || ''}`.toLowerCase()
      if (!hay.includes(text)) return false
    }

    if (excludeTerms.length) {
      const hay = `${entry.method} ${entry.url} ${entry.matchedRuleName || ''} ${entry.appliedAction || ''}`.toLowerCase()
      if (excludeTerms.some(term => hay.includes(term))) return false
    }

    return true
  })
}

function renderHeader() {
  const attached = appState.attachedTabId && appState.activeTab?.id === appState.attachedTabId
  const statusClass = appState.attachBusy ? 'is-busy' : attached ? 'is-attached' : 'is-detached'
  const statusText = appState.attachBusy
    ? 'Connecting...'
    : attached
      ? 'Attached to current tab'
      : 'Not attached to current tab'

  return `
    <header class="header">
      <div class="header-top">
        <div class="brand">
          <h1>MockPilot</h1>
          <p class="attach-status ${statusClass}">${statusText}</p>
        </div>
        <div class="header-actions compact">
          <button class="btn ${attached ? 'warning' : 'primary'}" id="attach-btn" ${appState.attachBusy ? 'disabled' : ''}>${appState.attachBusy ? 'Attaching...' : attached ? 'Reattach' : 'Attach'}</button>
          <button class="btn ghost" id="detach-btn" ${(!attached || appState.attachBusy) ? 'disabled' : ''}>Detach</button>
        </div>
      </div>
      <div class="header-secondary">
        <button class="link-btn" id="reload-tab-btn" ${(!attached || appState.attachBusy) ? 'disabled' : ''}>Reload current page to apply rules</button>
      </div>
      <div class="tabs">
        ${['rules', 'network', 'logs'].map(tab => `
          <button class="tab ${appState.currentTab === tab ? 'active' : ''}" data-tab="${tab}">
            ${tab[0].toUpperCase() + tab.slice(1)}
          </button>
        `).join('')}
      </div>
    </header>
  `
}

function renderRulesTab() {
  const form = appState.form || defaultRuleForm()
  const matchedRuleIds = new Set(appState.networkEntries.map(entry => entry.matchedRuleId).filter(Boolean))
  const isEditing = Boolean(form.id)
  const modeClass = isEditing ? 'edit' : 'create'
  const modeLabel = isEditing ? 'Editing existing rule' : 'Creating new rule'
  const modeMeta = isEditing ? `Rule ID: ${form.id}` : 'This rule will be added as a new entry'
  return `
    <section class="content">
      <div class="card">
        <div class="row space-between">
          <h2>Folders</h2>
          <button class="btn compact-btn" id="create-folder-btn">New folder</button>
        </div>
        <div class="list">
          ${appState.folders.length ? appState.folders.map(folder => `
            <div class="item">
              <div class="item-title">
                <div>
                  <strong>${escapeHtml(folder.name)}</strong>
                  <div class="item-meta">${appState.rules.filter(rule => rule.folderId === folder.id).length} rules</div>
                </div>
                <label class="switch">
                  <input type="checkbox" data-folder-toggle="${folder.id}" ${folder.enabled ? 'checked' : ''} />
                  enabled
                </label>
              </div>
              <div class="footer-actions">
                <button class="btn" data-folder-rename="${folder.id}">Rename</button>
                ${folder.id === 'folder-default' ? '' : `<button class="btn danger" data-folder-delete="${folder.id}">Delete</button>`}
              </div>
            </div>
          `).join('') : '<div class="empty">No folders yet.</div>'}
        </div>
      </div>

      <div class="card">
        <div class="row space-between">
          <h2>${isEditing ? 'Edit rule' : 'Create rule'}</h2>
          <div class="footer-actions">
            <button class="btn" id="rule-reset-btn">Reset</button>
            <button class="btn primary" id="rule-save-btn">${isEditing ? 'Update rule' : 'Create rule'}</button>
          </div>
        </div>
        <div class="rule-mode-banner ${modeClass}">
          <strong>${modeLabel}</strong>
          <span>${escapeHtml(modeMeta)}</span>
        </div>
        ${appState.rulesNotice ? `<div class="notice">${escapeHtml(appState.rulesNotice)}</div>` : ''}
        <div class="column">
          <input id="rule-id" type="hidden" value="${escapeHtml(form.id || '')}" />
          <div>
            <div class="label">Rule name</div>
            <input class="input" id="rule-name" value="${escapeHtml(form.name)}" />
          </div>
          <div class="grid-2">
            <div>
              <div class="label">Folder</div>
              <select class="select" id="rule-folder">
                ${appState.folders.map(folder => `<option value="${folder.id}" ${form.folderId === folder.id ? 'selected' : ''}>${escapeHtml(folder.name)}</option>`).join('')}
              </select>
            </div>
            <div>
              <div class="label">Priority</div>
              <input class="input" id="rule-priority" type="number" value="${escapeHtml(form.priority)}" />
            </div>
          </div>
          <label class="switch">
            <input id="rule-enabled" type="checkbox" ${form.enabled ? 'checked' : ''} /> enabled
          </label>
          <hr class="sep" />
          <div>
            <div class="label">URL pattern</div>
            <input class="input" id="rule-url-pattern" value="${escapeHtml(form.match.urlPattern)}" placeholder="/api/videos" />
          </div>
          <div class="grid-2">
            <div>
              <div class="label">Match type</div>
              <select class="select" id="rule-match-type">${MATCH_TYPES.map(type => `<option value="${type}" ${form.match.matchType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
            </div>
            <div>
              <div class="label">Method</div>
              <select class="select" id="rule-method">${METHODS.map(method => `<option value="${method}" ${form.match.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
            </div>
          </div>
          <div>
            <div class="label">Resource type</div>
            <select class="select" id="rule-resource-type">${RESOURCE_TYPES.map(type => `<option value="${type}" ${form.match.resourceType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
          </div>
          <hr class="sep" />
          <div>
            <div class="label">Action type</div>
            <select class="select" id="rule-action-type">${ACTION_TYPES.map(type => `<option value="${type}" ${form.actionType === type ? 'selected' : ''}>${type}</option>`).join('')}</select>
          </div>
          <div class="grid-2">
            <div>
              <div class="label">Status code</div>
              <input class="input" id="rule-status-code" type="number" value="${escapeHtml(form.action.statusCode)}" />
            </div>
            <div>
              <div class="label">Status text</div>
              <input class="input" id="rule-status-text" value="${escapeHtml(form.action.statusText)}" />
            </div>
          </div>
          <div class="grid-2">
            <div>
              <div class="label">Content-Type</div>
              <input class="input" id="rule-content-type" value="${escapeHtml(form.action.contentType)}" />
            </div>
            <div>
              <div class="label">Delay (ms)</div>
              <input class="input" id="rule-delay-ms" type="number" value="${escapeHtml(form.action.delayMs)}" />
            </div>
          </div>
          <div class="row wrap">
            <label class="switch"><input id="rule-apply-response-headers" type="checkbox" ${form.action.applyResponseHeaders ? 'checked' : ''} /> apply response headers + status</label>
            <label class="switch"><input id="rule-apply-response-body" type="checkbox" ${form.action.applyResponseBody ? 'checked' : ''} /> apply response body</label>
          </div>
          <div>
            <div class="label">Fail reason</div>
            <select class="select" id="rule-fail-reason">${FAIL_REASONS.map(reason => `<option value="${reason}" ${form.action.failReason === reason ? 'selected' : ''}>${reason}</option>`).join('')}</select>
          </div>
          <div>
            <div class="label">Response headers (one per line)</div>
            <textarea class="textarea" id="rule-response-headers" placeholder="x-mock: true\ncache-control: no-store">${escapeHtml(form.action.responseHeadersText)}</textarea>
          </div>
          <div>
            <div class="label">Response body</div>
            <textarea class="textarea" id="rule-response-body">${escapeHtml(prettyJson(form.action.responseBody))}</textarea>
          </div>
          <div>
            <div class="label">JSON preview</div>
            <pre class="preview">${escapeHtml(prettyJson(form.action.responseBody))}</pre>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Rules</h2>
        <div class="footer-actions" style="margin-top:0; margin-bottom:10px;">
          <button class="btn" id="import-rule-json-btn">Import JSON</button>
        </div>
        <div class="list">
          ${appState.rules.length ? appState.rules.map(rule => `
            <div class="item ${matchedRuleIds.has(rule.id) ? 'rule-live' : ''}" data-rule-card-id="${rule.id}">
              <div class="item-title">
                <div>
                  <strong>${escapeHtml(rule.name)}</strong>
                  <div class="item-meta">${escapeHtml(rule.match.method || 'ANY')} · ${escapeHtml(rule.match.matchType)} · ${escapeHtml(rule.match.urlPattern)} · ${escapeHtml(folderName(rule.folderId))}</div>
                </div>
                <label class="switch">
                  <input type="checkbox" data-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''} />
                  enabled
                </label>
              </div>
              <div class="footer-actions">
                <div class="rule-badge-row">${badgeForAction(rule.actionType)}</div>
                <div class="rule-actions-row">
                  <button class="btn" data-rule-edit="${rule.id}">Edit</button>
                  <button class="btn" data-rule-import-into="${rule.id}">Import JSON</button>
                  <button class="btn" data-rule-export="${rule.id}">Export JSON</button>
                  <button class="btn" data-rule-duplicate="${rule.id}">Duplicate</button>
                  <button class="btn danger" data-rule-delete="${rule.id}">Delete</button>
                </div>
              </div>
            </div>
          `).join('') : '<div class="empty">No rules yet.</div>'}
        </div>
      </div>
    </section>
  `
}

function renderNetworkTab() {
  const entries = filteredNetworkEntries()
  return `
    <section class="content">
      <div class="card">
        <div class="row space-between network-toolbar">
          <h2>Network</h2>
          <div class="footer-actions network-actions">
            <button class="btn" id="network-refresh-btn">Refresh</button>
            <button class="btn" id="network-clear-btn">Clear</button>
          </div>
        </div>
        <div class="column network-filters">
          <input class="input" id="network-filter-text" placeholder="Filter by URL, method or rule" value="${escapeHtml(appState.filters.text)}" />
          <input class="input" id="network-filter-exclude" placeholder="Hide terms (use ;). Example: kaspersky;chrome-extension" value="${escapeHtml(appState.filters.excludeText)}" />
          <div class="grid-2">
            <select class="select" id="network-filter-method">${METHODS.map(method => `<option value="${method}" ${appState.filters.method === method ? 'selected' : ''}>${method}</option>`).join('')}</select>
            <input class="input" id="network-filter-status" placeholder="Status" value="${escapeHtml(appState.filters.status)}" />
          </div>
          <div class="row wrap">
            <label class="switch"><input type="checkbox" id="network-filter-intercepted" ${appState.filters.interceptedOnly ? 'checked' : ''} /> intercepted only</label>
            <label class="switch"><input type="checkbox" id="network-filter-matched" ${appState.filters.matchedOnly ? 'checked' : ''} /> matched only</label>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="table" id="network-results">
          ${renderNetworkEntries(entries)}
        </div>
      </div>
    </section>
  `
}

function renderNetworkEntries(entries) {
  return entries.length ? entries.map(entry => `
            <div class="table-row">
              <div>
                <strong>${escapeHtml(entry.method || '—')}</strong>
                <div class="small">${escapeHtml(entry.resourceType || 'Other')}</div>
              </div>
              <div class="url">
                <strong title="${escapeHtml(entry.url)}">${escapeHtml(entry.url)}</strong>
                <span>${escapeHtml(entry.matchedRuleName || 'No matching rule')} · ${escapeHtml(entry.appliedAction || 'passThrough')}</span>
              </div>
              <div>
                ${statusBadge(entry.status)}
                <div class="footer-actions">
                  <button class="btn" data-create-from-request="${entry.id}">Rule</button>
                </div>
              </div>
            </div>
          `).join('') : '<div class="empty">No requests captured yet. Attach the debugger and reload the page.</div>'
}

function updateNetworkResultsOnly() {
  if (appState.currentTab !== 'network') return
  const container = $('#network-results')
  if (!container) return
  container.innerHTML = renderNetworkEntries(filteredNetworkEntries())
  bindCreateRuleFromRequestEvents()
}

function bindCreateRuleFromRequestEvents() {
  document.querySelectorAll('[data-create-from-request]').forEach(button => {
    button.addEventListener('click', async () => {
      const result = await sendMessage({ type: 'rule:createFromRequest', entryId: button.dataset.createFromRequest })
      if (result.error) return alert(result.error)
      appState.currentTab = 'rules'
      await refreshState()
      if (result.createdRule) {
        appState.rulesNotice = 'Rule created from selected request. Review and Save rule adjustments if needed.'
        appState.form = defaultRuleForm(result.createdRule)
        render()
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })
  })
}

function updateRuleLiveIndicators() {
  if (appState.currentTab !== 'rules') return
  const matchedRuleIds = new Set(appState.networkEntries.map(entry => entry.matchedRuleId).filter(Boolean))
  document.querySelectorAll('[data-rule-card-id]').forEach(card => {
    const ruleId = card.dataset.ruleCardId
    if (matchedRuleIds.has(ruleId)) card.classList.add('rule-live')
    else card.classList.remove('rule-live')
  })
}

function renderLogsTab() {
  return `
    <section class="content">
      <div class="card">
        <div class="row space-between">
          <h2>Logs</h2>
          <button class="btn compact-btn" id="logs-clear-btn">Clear logs</button>
        </div>
        <div class="list">
          ${appState.logs.length ? appState.logs.map(log => `
            <div class="item">
              <div class="item-title">
                <div>
                  <strong>${escapeHtml(log.message || '')}</strong>
                  <div class="item-meta">${escapeHtml(log.timestamp || '')}</div>
                </div>
                ${log.level === 'error' ? '<span class="badge danger">error</span>' : log.level === 'warn' ? '<span class="badge warning">warn</span>' : '<span class="badge success">info</span>'}
              </div>
              <div class="item-meta">${escapeHtml(log.url || '')}</div>
            </div>
          `).join('') : '<div class="empty">No logs yet.</div>'}
        </div>
      </div>
    </section>
  `
}

function render() {
  const root = $('#app')
  root.innerHTML = `${renderHeader()}${appState.currentTab === 'rules' ? renderRulesTab() : appState.currentTab === 'network' ? renderNetworkTab() : renderLogsTab()}${renderModal()}`
  bindEvents()
}

function bindEvents() {
  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => {
      appState.currentTab = button.dataset.tab
      render()
    })
  })

  $('#attach-btn')?.addEventListener('click', async () => {
    if (appState.attachBusy) return
    appState.attachBusy = true
    render()
    const result = await sendMessage({ type: 'debugger:attachActiveTab' })
    appState.attachBusy = false
    if (result.error) {
      appState.currentTab = 'logs'
      alert(result.error)
    }
    await refreshState()
  })

  $('#reload-tab-btn')?.addEventListener('click', async () => {
    if (appState.attachBusy) return
    const result = await sendMessage({ type: 'tab:reload' })
    if (result.error) {
      appState.currentTab = 'logs'
      render()
    }
  })

  $('#detach-btn')?.addEventListener('click', async () => {
    if (appState.attachBusy) return
    appState.attachBusy = true
    render()
    const result = await sendMessage({ type: 'debugger:detach' })
    appState.attachBusy = false
    if (result.error) alert(result.error)
    await refreshState()
  })

  $('#create-folder-btn')?.addEventListener('click', async () => {
    const name = prompt('Folder name')
    if (!name) return
    const result = await sendMessage({ type: 'folders:create', payload: { name } })
    if (result.error) return alert(result.error)
    await refreshState()
  })

  document.querySelectorAll('[data-folder-toggle]').forEach(input => {
    input.addEventListener('change', async () => {
      await sendMessage({
        type: 'folders:update',
        payload: { id: input.dataset.folderToggle, enabled: input.checked }
      })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-folder-rename]').forEach(button => {
    button.addEventListener('click', async () => {
      const folder = appState.folders.find(item => item.id === button.dataset.folderRename)
      const name = prompt('New folder name', folder?.name || '')
      if (!name) return
      await sendMessage({ type: 'folders:update', payload: { id: folder.id, name } })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-folder-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      if (!confirm('Delete this folder? Rules will move to Default.')) return
      await sendMessage({ type: 'folders:delete', folderId: button.dataset.folderDelete })
      await refreshState()
    })
  })

  $('#rule-save-btn')?.addEventListener('click', saveRule)
  $('#rule-reset-btn')?.addEventListener('click', resetForm)
  $('#rule-response-body')?.addEventListener('input', () => {
    const preview = document.querySelector('.preview')
    if (preview) preview.textContent = prettyJson($('#rule-response-body')?.value || '')
  })

  document.querySelectorAll('[data-rule-edit]').forEach(button => {
    button.addEventListener('click', () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleEdit)
      if (rule) setFormFromRule(rule)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  })

  document.querySelectorAll('[data-rule-toggle]').forEach(input => {
    input.addEventListener('change', async () => {
      const rule = appState.rules.find(item => item.id === input.dataset.ruleToggle)
      await sendMessage({ type: 'rules:update', payload: { ...rule, enabled: input.checked } })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-rule-delete]').forEach(button => {
    button.addEventListener('click', async () => {
      const shouldDelete = await openModal({
        mode: 'confirm',
        title: 'Delete rule',
        message: 'Delete this rule?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      })
      if (!shouldDelete) return
      await sendMessage({ type: 'rules:delete', ruleId: button.dataset.ruleDelete })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-rule-duplicate]').forEach(button => {
    button.addEventListener('click', async () => {
      await sendMessage({ type: 'rules:duplicate', ruleId: button.dataset.ruleDuplicate })
      await refreshState()
    })
  })

  document.querySelectorAll('[data-rule-import-into]').forEach(button => {
    button.addEventListener('click', async () => {
      const targetRuleId = button.dataset.ruleImportInto
      const targetRule = appState.rules.find(item => item.id === targetRuleId)
      if (!targetRule) return

      const raw = await openModal({
        mode: 'json-input',
        title: `Import JSON into "${targetRule.name}"`,
        message: 'Paste rule JSON below. It will overwrite this rule.',
        value: '',
        confirmText: 'Import and overwrite',
        cancelText: 'Cancel'
      })
      if (!raw) return

      let parsed
      try {
        parsed = JSON.parse(raw)
      } catch {
        await openModal({
          mode: 'info',
          title: 'Import error',
          message: 'Invalid JSON format.',
          confirmText: 'OK'
        })
        return
      }

      const validationError = validateImportedRule(parsed)
      if (validationError) {
        await openModal({
          mode: 'info',
          title: 'Import error',
          message: validationError,
          confirmText: 'OK'
        })
        return
      }

      const result = await sendMessage({
        type: 'rules:update',
        payload: { ...parsed, id: targetRuleId }
      })
      if (result.error) {
        await openModal({
          mode: 'info',
          title: 'Import error',
          message: result.error,
          confirmText: 'OK'
        })
        return
      }

      appState.rulesNotice = `Rule "${targetRule.name}" overwritten from JSON.`
      await refreshState()
    })
  })

  $('#import-rule-json-btn')?.addEventListener('click', async () => {
    const raw = await openModal({
      mode: 'json-input',
      title: 'Import Rule JSON',
      message: 'Paste rule JSON below.',
      value: '',
      confirmText: 'Import',
      cancelText: 'Cancel'
    })
    if (!raw) return

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      await openModal({
        mode: 'info',
        title: 'Import error',
        message: 'Invalid JSON format.',
        confirmText: 'OK'
      })
      return
    }

    const validationError = validateImportedRule(parsed)
    if (validationError) {
      await openModal({
        mode: 'info',
        title: 'Import error',
        message: validationError,
        confirmText: 'OK'
      })
      return
    }

    const editingRuleId = appState.form?.id || null
    let result

    if (editingRuleId) {
      const overwriteCurrent = await openModal({
        mode: 'confirm',
        title: 'Import rule',
        message: 'Overwrite current editing rule? (Cancel imports as new)',
        confirmText: 'Overwrite',
        cancelText: 'Import as new'
      })
      if (overwriteCurrent) {
        result = await sendMessage({
          type: 'rules:update',
          payload: { ...parsed, id: editingRuleId }
        })
      } else {
        result = await sendMessage({ type: 'rules:create', payload: parsed })
      }
    } else {
      result = await sendMessage({ type: 'rules:create', payload: parsed })
    }

    if (result.error) {
      await openModal({
        mode: 'info',
        title: 'Import error',
        message: result.error,
        confirmText: 'OK'
      })
      return
    }

    appState.rulesNotice = editingRuleId
      ? 'Rule JSON imported successfully.'
      : 'Rule imported from JSON.'
    await refreshState()
  })

  document.querySelectorAll('[data-rule-export]').forEach(button => {
    button.addEventListener('click', async () => {
      const rule = appState.rules.find(item => item.id === button.dataset.ruleExport)
      if (!rule) return

      const exported = {
        name: rule.name,
        enabled: rule.enabled,
        folderId: rule.folderId,
        priority: rule.priority,
        match: rule.match,
        actionType: rule.actionType,
        action: rule.action
      }

      const json = JSON.stringify(exported, null, 2)
      const copied = await copyText(json).catch(() => false)
      if (!copied) {
        await openModal({
          mode: 'json-input',
          title: 'Export Rule JSON',
          message: 'Copy the JSON below.',
          value: json,
          confirmText: 'Close',
          cancelText: 'Cancel'
        })
        return
      }
      await openModal({
        mode: 'info',
        title: 'Export',
        message: 'Rule JSON copied to clipboard.',
        confirmText: 'OK'
      })
    })
  })

  $('#modal-confirm-btn')?.addEventListener('click', () => {
    if (appState.modal.mode === 'json-input') {
      closeModal($('#modal-json-input')?.value ?? '')
      return
    }
    closeModal(true)
  })
  $('#modal-cancel-btn')?.addEventListener('click', () => {
    if (appState.modal.mode === 'confirm') {
      closeModal(false)
      return
    }
    closeModal(null)
  })

  $('#network-refresh-btn')?.addEventListener('click', refreshState)
  $('#network-clear-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: 'network:clear' })
    await refreshState()
  })
  $('#logs-clear-btn')?.addEventListener('click', async () => {
    await sendMessage({ type: 'logs:clear' })
    await refreshState()
  })

  $('#network-filter-text')?.addEventListener('input', event => {
    appState.filters.text = event.target.value
    updateNetworkResultsOnly()
  })
  $('#network-filter-exclude')?.addEventListener('input', event => {
    appState.filters.excludeText = event.target.value
    updateNetworkResultsOnly()
  })
  $('#network-filter-method')?.addEventListener('change', event => {
    appState.filters.method = event.target.value
    updateNetworkResultsOnly()
  })
  $('#network-filter-status')?.addEventListener('input', event => {
    appState.filters.status = event.target.value
    updateNetworkResultsOnly()
  })
  $('#network-filter-intercepted')?.addEventListener('change', event => {
    appState.filters.interceptedOnly = event.target.checked
    updateNetworkResultsOnly()
  })
  $('#network-filter-matched')?.addEventListener('change', event => {
    appState.filters.matchedOnly = event.target.checked
    updateNetworkResultsOnly()
  })

  bindCreateRuleFromRequestEvents()
}

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'state:logs') {
    appState.logs = message.logs
    if (appState.currentTab === 'logs') render()
  }

  if (message?.type === 'state:network') {
    appState.networkEntries = message.networkEntries
    if (appState.currentTab === 'network') updateNetworkResultsOnly()
    if (appState.currentTab === 'rules') updateRuleLiveIndicators()
  }

  if (message?.type === 'state:attached') {
    appState.attachedTabId = message.attachedTabId
    render()
  }
})

refreshState()
