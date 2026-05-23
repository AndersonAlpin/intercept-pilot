import { escapeHtml, tryPrettyJson } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderIconButton } from '../../shared/ui/icon-button.js'

function parseQueryParams(url) {
  try {
    const u = new URL(url)
    return Array.from(u.searchParams.entries()).map(([key, value]) => ({ key, value }))
  } catch {
    return []
  }
}

function getHandlingLabel(entry) {
  const action = String(entry?.appliedAction || 'passThrough')
  if (action === 'mockResponse') return t('network.resultMock200', { status: String(entry?.status || 200) })
  if (action === 'delayOnly') return t('network.resultDelay')
  if (action === 'failRequest') return t('network.resultFail')
  return t('network.resultPassThrough')
}

function getStatusClass(status) {
  const s = Number(status)
  if (!s) return 'unknown'
  if (s >= 500) return 'error'
  if (s >= 400) return 'warning'
  if (s >= 300) return 'redirect'
  if (s >= 200) return 'success'
  return 'info'
}

function renderHeadersTable(headers, copyAllAction) {
  if (!headers || !headers.length) {
    return `<p class="muted">${escapeHtml(t('network.inspector.noBody'))}</p>`
  }
  return `
    <div class="inspector-headers">
      <div class="inspector-headers-actions">
        ${renderButton({
          label: t('network.inspector.copyAllHeaders'),
          variant: 'secondary',
          data: { 'inspector-copy-all': copyAllAction }
        })}
      </div>
      <table class="kv-table">
        <tbody>
          ${headers.map(h => `
            <tr>
              <th>${escapeHtml(h.name)}</th>
              <td>${escapeHtml(h.value)}</td>
              <td class="kv-actions">${renderIconButton({
                iconName: 'copy',
                label: t('network.inspector.copyHeader'),
                variant: 'ghost',
                size: 12,
                data: { 'inspector-copy-header': `${h.name}::${h.value}` }
              })}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderBody(text, options = {}) {
  if (text == null || text === '') {
    return `<p class="muted">${escapeHtml(t('network.inspector.noBody'))}</p>`
  }
  const { pretty, isJson } = tryPrettyJson(text)
  const kind = options.kind || 'body'
  return `
    <div class="code-wrap">
      ${renderIconButton({
        iconName: 'copy',
        label: t('common.copy'),
        variant: 'ghost',
        className: 'code-copy-btn',
        size: 12,
        data: { 'inspector-copy-body': kind }
      })}
      <pre class="code-block ${isJson ? 'code-json' : 'code-raw'}">${escapeHtml(pretty)}</pre>
    </div>
    ${options.truncated ? `<p class="muted">${escapeHtml(t('network.inspector.bodyTruncated'))}</p>` : ''}
  `
}

function renderOverviewTab(entry) {
  const handlingLabel = getHandlingLabel(entry)
  const captureSourceLabel = entry.source === 'compat'
    ? t('fullapp.captureModeLight')
    : t('fullapp.captureModeFull')
  return `
    <dl class="inspector-grid">
      <dt>${escapeHtml(t('network.inspector.method'))}</dt><dd>${escapeHtml(entry.method || '—')}</dd>
      <dt>${escapeHtml(t('network.inspector.url'))}</dt><dd><code class="url">${escapeHtml(entry.url || '')}</code></dd>
      <dt>${escapeHtml(t('network.inspector.status'))}</dt><dd>${escapeHtml(String(entry.status ?? '—'))} ${escapeHtml(entry.statusText || '')}</dd>
      <dt>${escapeHtml(t('network.inspector.duration'))}</dt><dd>${entry.durationMs != null ? `${entry.durationMs}ms` : '—'}</dd>
      <dt>${escapeHtml(t('network.inspector.resourceType'))}</dt><dd>${escapeHtml(entry.resourceType || '—')}</dd>
      <dt>${escapeHtml(t('network.inspector.source'))}</dt><dd>${escapeHtml(captureSourceLabel)}</dd>
      <dt>${escapeHtml(t('network.inspector.appliedRule'))}</dt><dd>${escapeHtml(entry.matchedRuleName || t('network.noRule'))}</dd>
      <dt>${escapeHtml(t('network.inspector.handling'))}</dt><dd>${escapeHtml(handlingLabel)}</dd>
      <dt>${escapeHtml(t('network.inspector.requestId'))}</dt><dd><code>${escapeHtml(entry.requestId || '')}</code></dd>
      <dt>${escapeHtml(t('network.inspector.timestamp'))}</dt><dd>${entry.startedAt ? new Date(entry.startedAt).toISOString() : '—'}</dd>
    </dl>
  `
}

function renderRequestTab(entry) {
  const queryParams = parseQueryParams(entry.url || '')
  return `
    <section class="inspector-section">
      <h4>${escapeHtml(t('network.inspector.queryParams'))}</h4>
      ${queryParams.length ? `
        <table class="kv-table">
          <tbody>
            ${queryParams.map(p => `<tr><th>${escapeHtml(p.key)}</th><td>${escapeHtml(p.value)}</td></tr>`).join('')}
          </tbody>
        </table>
      ` : `<p class="muted">${escapeHtml(t('network.inspector.noQueryParams'))}</p>`}
    </section>
    <section class="inspector-section">
      <h4>${escapeHtml(t('network.inspector.requestHeaders'))}</h4>
      ${renderHeadersTable(entry.requestHeaders, 'request')}
    </section>
    <section class="inspector-section">
      <h4>${escapeHtml(t('network.inspector.requestBody'))}</h4>
      ${renderBody(entry.requestPostData, { truncated: entry.requestPostDataTruncated, kind: 'request' })}
    </section>
  `
}

export function expectsNoBody(entry) {
  if (!entry) return false
  const status = Number(entry.status)
  if (status === 204 || status === 205 || status === 304) return true
  const method = String(entry.method || '').toUpperCase()
  if (method === 'HEAD') return true
  const contentLength = (entry.responseHeaders || []).find(
    h => String(h?.name || '').toLowerCase() === 'content-length'
  )
  if (contentLength && String(contentLength.value).trim() === '0') return true
  return false
}

function renderResponseBodySection(entry) {
  if (expectsNoBody(entry)) {
    return `<p class="muted">${escapeHtml(t('network.inspector.noBody'))}</p>`
  }
  const status = entry.responseBodyLoaded || 'idle'
  if (entry.source === 'compat' && status === 'idle') {
    return `<p class="muted">${escapeHtml(t('network.inspector.bodyUnavailable'))}</p>`
  }
  if (status === 'idle') {
    return renderButton({
      label: t('network.inspector.loadBody'),
      variant: 'secondary',
      data: { 'inspector-load-body': true }
    })
  }
  if (status === 'error') {
    return `
      ${renderButton({
        label: t('network.inspector.loadBody'),
        variant: 'secondary',
        data: { 'inspector-load-body': true }
      })}
      <p class="muted error">${escapeHtml(t('network.inspector.bodyUnavailable'))}</p>
    `
  }
  if (status === 'loading') {
    return `<p class="muted">${escapeHtml(t('network.inspector.loadingBody'))}</p>`
  }
  return renderBody(entry.responseBody, { truncated: entry.responseBodyTruncated, kind: 'response' })
}

function renderResponseTab(entry) {
  return `
    <section class="inspector-section">
      <h4>${escapeHtml(t('network.inspector.responseHeaders'))}</h4>
      ${renderHeadersTable(entry.responseHeaders, 'response')}
    </section>
    <section class="inspector-section">
      <h4>${escapeHtml(t('network.inspector.responseBody'))}</h4>
      ${renderResponseBodySection(entry)}
    </section>
  `
}

function renderTimingTab(entry) {
  const rows = []
  if (entry.startedAt) rows.push(['network.inspector.startedAt', new Date(entry.startedAt).toISOString()])
  if (entry.endedAt) rows.push(['network.inspector.endedAt', new Date(entry.endedAt).toISOString()])
  if (entry.durationMs != null) rows.push(['network.inspector.duration', `${entry.durationMs}ms`])
  return `
    <dl class="inspector-grid">
      ${rows.map(([key, value]) => `<dt>${escapeHtml(t(key))}</dt><dd>${escapeHtml(value)}</dd>`).join('')}
    </dl>
  `
}

function renderErrorTab(entry) {
  return `
    <dl class="inspector-grid">
      <dt>${escapeHtml(t('network.inspector.errorType'))}</dt><dd>${escapeHtml(entry.errorType || '—')}</dd>
      <dt>${escapeHtml(t('network.inspector.errorMessage'))}</dt><dd>${escapeHtml(entry.errorText || '—')}</dd>
      <dt>${escapeHtml(t('network.inspector.status'))}</dt><dd>${escapeHtml(String(entry.status ?? '—'))}</dd>
    </dl>
  `
}

function hasError(entry) {
  return Boolean(entry?.errorText || entry?.errorType)
}

export function renderInspectorBody(entry, tab) {
  if (!entry) return ''
  const notice = entry.source === 'compat'
    ? `<div class="inspector-notice">${escapeHtml(t('network.inspector.lightCaptureNotice'))}</div>`
    : ''
  if (tab === 'request') return `${notice}${renderRequestTab(entry)}`
  if (tab === 'response') return `${notice}${renderResponseTab(entry)}`
  if (tab === 'timing') return `${notice}${renderTimingTab(entry)}`
  if (tab === 'error') return `${notice}${renderErrorTab(entry)}`
  return `${notice}${renderOverviewTab(entry)}`
}

export function renderNetworkInspectorModal(state) {
  if (!state.inspector) return ''
  const entry = (state.visibleNetworkEntries || []).find(e => e.id === state.inspector.entryId)
  if (!entry) return ''
  const tab = state.inspector.tab || 'overview'
  const showError = hasError(entry)
  const statusClass = getStatusClass(entry.status)
  return `
    <div class="modal-backdrop modal-large inspector-backdrop" data-inspector-backdrop>
      <div class="modal inspector-modal" role="dialog" aria-modal="true">
        <header class="modal-header">
          <div class="inspector-summary">
            <span class="method-badge" data-method="${escapeHtml(entry.method || '')}">${escapeHtml(entry.method || '—')}</span>
            <span class="status-badge" data-status-class="${statusClass}">${escapeHtml(String(entry.status ?? '—'))}</span>
            <code class="inspector-url">${escapeHtml(entry.url || '')}</code>
          </div>
          <button class="modal-close" id="inspector-close-x" type="button" aria-label="${escapeHtml(t('common.close'))}">${icon('close', 16)}</button>
        </header>
        <nav class="modal-tabs" role="tablist">
          ${['overview', 'request', 'response', 'timing'].map(name => `
            <button role="tab" type="button" class="modal-tab ${tab === name ? 'active' : ''}" data-inspector-tab="${name}">${escapeHtml(t(`network.inspector.${name}`))}</button>
          `).join('')}
          ${showError ? `<button role="tab" type="button" class="modal-tab modal-tab-error ${tab === 'error' ? 'active' : ''}" data-inspector-tab="error">${escapeHtml(t('network.inspector.error'))}</button>` : ''}
        </nav>
        <div class="modal-body inspector-body" id="inspector-body">
          ${renderInspectorBody(entry, tab)}
        </div>
        <footer class="modal-footer inspector-footer">
          ${renderButton({
            label: t('network.inspector.createRule'),
            variant: 'primary',
            data: { 'inspector-action': 'create-rule' }
          })}
          ${renderButton({
            label: t('network.inspector.copyAsFetch'),
            variant: 'secondary',
            data: { 'inspector-action': 'copy-fetch' }
          })}
          ${renderButton({
            label: t('network.inspector.copyAsCurl'),
            variant: 'secondary',
            data: { 'inspector-action': 'copy-curl' }
          })}
        </footer>
      </div>
    </div>
  `
}
