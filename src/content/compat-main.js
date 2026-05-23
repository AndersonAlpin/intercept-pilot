(() => {
  if (window.__MOCKPILOT_COMPAT_FETCH_INSTALLED__) return
  if (typeof window.fetch !== 'function') return

  const MESSAGE_PREFIX = 'mockpilot:compat:'
  const MAX_BODY_CHARS = 64 * 1024
  const originalFetch = window.fetch.bind(window)
  const pending = new Map()

  window.__MOCKPILOT_COMPAT_FETCH_INSTALLED__ = true

  function nextId() {
    const cryptoObj = window.crypto
    if (cryptoObj?.randomUUID) return `compat-${cryptoObj.randomUUID()}`
    return `compat-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  function delay(ms) {
    const value = Number(ms || 0)
    if (!Number.isFinite(value) || value <= 0) return Promise.resolve()
    return new Promise(resolve => setTimeout(resolve, value))
  }

  function truncateText(value) {
    const text = String(value ?? '')
    if (text.length <= MAX_BODY_CHARS) {
      return { value: text, truncated: false }
    }
    return { value: text.slice(0, MAX_BODY_CHARS), truncated: true }
  }

  function headersToList(headers) {
    const list = []
    if (!headers) return list
    try {
      new Headers(headers).forEach((value, name) => {
        list.push({ name, value: String(value ?? '') })
      })
    } catch {}
    return list
  }

  function mergeHeaders(input, init) {
    const merged = new Headers()
    try {
      if (input instanceof Request) {
        input.headers.forEach((value, name) => merged.set(name, value))
      }
    } catch {}
    try {
      if (init?.headers) {
        new Headers(init.headers).forEach((value, name) => merged.set(name, value))
      }
    } catch {}
    return headersToList(merged)
  }

  function resolveUrl(input) {
    try {
      if (input instanceof Request) return input.url
      return new URL(String(input), window.location.href).href
    } catch {
      return String(input || '')
    }
  }

  function resolveMethod(input, init) {
    return String(init?.method || (input instanceof Request ? input.method : 'GET') || 'GET').toUpperCase()
  }

  async function serializeBodyValue(body) {
    if (body == null) return { body: null, truncated: false, unavailable: false }
    if (typeof body === 'string') {
      const result = truncateText(body)
      return { body: result.value, truncated: result.truncated, unavailable: false }
    }
    if (body instanceof URLSearchParams) {
      const result = truncateText(body.toString())
      return { body: result.value, truncated: result.truncated, unavailable: false }
    }
    if (body instanceof FormData) {
      const parts = []
      body.forEach((value, key) => {
        if (value instanceof File) {
          parts.push(`${key}=[File:${value.name},${value.type || 'application/octet-stream'},${value.size}]`)
        } else {
          parts.push(`${key}=${String(value)}`)
        }
      })
      const result = truncateText(parts.join('&'))
      return { body: result.value, truncated: result.truncated, unavailable: false }
    }
    if (body instanceof Blob && body.size <= MAX_BODY_CHARS) {
      const result = truncateText(await body.text())
      return { body: result.value, truncated: result.truncated, unavailable: false }
    }
    if (
      body instanceof ArrayBuffer
      || ArrayBuffer.isView(body)
      || (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
      || body instanceof Blob
    ) {
      return { body: '[body unavailable]', truncated: false, unavailable: true }
    }
    const result = truncateText(String(body))
    return { body: result.value, truncated: result.truncated, unavailable: false }
  }

  async function serializeRequestBody(input, init, method) {
    if (method === 'GET' || method === 'HEAD') return { body: null, truncated: false, unavailable: false }
    if (init && Object.prototype.hasOwnProperty.call(init, 'body')) {
      return serializeBodyValue(init.body)
    }
    if (input instanceof Request) {
      try {
        return serializeBodyValue(await input.clone().text())
      } catch {
        return { body: '[body unavailable]', truncated: false, unavailable: true }
      }
    }
    return { body: null, truncated: false, unavailable: false }
  }

  function postToBridge(type, payload) {
    window.postMessage({
      source: 'mockpilot-compat-main',
      type: `${MESSAGE_PREFIX}${type}`,
      payload
    }, '*')
  }

  function requestDecision(payload) {
    return new Promise(resolve => {
      const timeout = setTimeout(() => {
        pending.delete(payload.compatRequestId)
        resolve({ action: 'passThrough', disabled: true, error: 'compat_decision_timeout' })
      }, 2500)
      pending.set(payload.compatRequestId, { resolve, timeout })
      postToBridge('request', payload)
    })
  }

  function normalizeDecision(decision) {
    const action = String(decision?.action || 'passThrough')
    if (['mockResponse', 'delayOnly', 'failRequest', 'passThrough'].includes(action)) {
      return { ...decision, action }
    }
    return { ...decision, action: 'passThrough' }
  }

  function headersContainTextBody(headers) {
    const contentType = String(headers.get('content-type') || '').toLowerCase()
    return contentType.includes('json')
      || contentType.includes('text/')
      || contentType.includes('application/xml')
      || contentType.includes('application/x-www-form-urlencoded')
  }

  async function readSmallResponseBody(response) {
    try {
      const headers = response.headers
      const length = Number(headers.get('content-length') || 0)
      if (length > MAX_BODY_CHARS) {
        return { body: null, loaded: 'unavailable', truncated: true }
      }
      if (length <= 0 || !headersContainTextBody(headers)) {
        return { body: null, loaded: 'idle', truncated: false }
      }
      const text = await response.clone().text()
      const result = truncateText(text)
      return { body: result.value, loaded: 'loaded', truncated: result.truncated }
    } catch {
      return { body: null, loaded: 'error', truncated: false }
    }
  }

  function responseHeadersInit(headers) {
    if (Array.isArray(headers)) return headers.map(item => [item.name, item.value])
    return headers || {}
  }

  async function completeFromResponse(compatRequestId, response, extra = {}) {
    const bodyInfo = extra.responseBody != null
      ? { body: String(extra.responseBody), loaded: 'loaded', truncated: false }
      : await readSmallResponseBody(response)
    postToBridge('complete', {
      compatRequestId,
      status: response.status,
      statusText: response.statusText || '',
      responseHeaders: headersToList(response.headers),
      responseMimeType: response.headers.get('content-type') || '',
      responseBody: bodyInfo.body,
      responseBodyLoaded: bodyInfo.loaded,
      responseBodyTruncated: bodyInfo.truncated,
      endedAt: Date.now()
    })
  }

  window.addEventListener('message', event => {
    if (event.source !== window) return
    const message = event.data
    if (!message || message.source !== 'mockpilot-compat-bridge') return
    if (message.type === `${MESSAGE_PREFIX}mode`) return
    if (message.type !== `${MESSAGE_PREFIX}decision`) return
    const item = pending.get(message.compatRequestId)
    if (!item) return
    clearTimeout(item.timeout)
    pending.delete(message.compatRequestId)
    item.resolve(normalizeDecision(message.payload))
  })

  window.fetch = async function mockpilotCompatFetch(input, init) {
    const compatRequestId = nextId()
    const startedAt = Date.now()
    const url = resolveUrl(input)
    const method = resolveMethod(input, init)
    const bodyInfo = await serializeRequestBody(input, init, method)
    const requestHeaders = mergeHeaders(input, init)

    const decision = await requestDecision({
      compatRequestId,
      url,
      method,
      headers: requestHeaders,
      body: bodyInfo.body,
      bodyTruncated: bodyInfo.truncated,
      bodyUnavailable: bodyInfo.unavailable,
      startedAt,
      documentUrl: window.location.href
    })

    if (decision.disabled) {
      return originalFetch(input, init)
    }

    try {
      if (decision.action === 'mockResponse') {
        await delay(decision.delayMs)
        const requestedStatusCode = Number(decision.statusCode || 200)
        const statusCode = requestedStatusCode >= 200 && requestedStatusCode <= 599 ? requestedStatusCode : 200
        const responseBody = [204, 205, 304].includes(statusCode) ? null : (decision.body || '')
        const response = new Response(responseBody, {
          status: statusCode,
          statusText: String(decision.statusText || 'OK'),
          headers: responseHeadersInit(decision.headers)
        })
        await completeFromResponse(compatRequestId, response, { responseBody: responseBody || '' })
        return response
      }

      if (decision.action === 'failRequest') {
        await delay(decision.delayMs)
        const message = String(decision.reason || 'Failed to fetch')
        postToBridge('error', {
          compatRequestId,
          status: 0,
          errorType: 'Fetch',
          errorText: message,
          endedAt: Date.now()
        })
        throw new TypeError(message)
      }

      if (decision.action === 'delayOnly') {
        await delay(decision.delayMs)
      }

      const response = await originalFetch(input, init)
      completeFromResponse(compatRequestId, response).catch(() => {})
      return response
    } catch (error) {
      if (decision.action !== 'failRequest') {
        postToBridge('error', {
          compatRequestId,
          status: 0,
          errorType: 'Fetch',
          errorText: error?.message || String(error),
          endedAt: Date.now()
        })
      }
      throw error
    }
  }
})()
