(() => {
  if (window.__INTERCEPTPILOT_COMPAT_BRIDGE_INSTALLED__) return
  window.__INTERCEPTPILOT_COMPAT_BRIDGE_INSTALLED__ = true

  const MESSAGE_PREFIX = 'interceptpilot:compat:'
  const MAIN_SCRIPT_URL = chrome.runtime.getURL('src/content/compat-main.js')

  let mainInjected = false
  let extensionContextAvailable = true

  function isHttpPage() {
    return location.protocol === 'http:' || location.protocol === 'https:'
  }

  function isCompatMessage(message, type) {
    return Boolean(
      message
      && typeof message === 'object'
      && message.source === 'interceptpilot-compat-main'
      && message.type === `${MESSAGE_PREFIX}${type}`
    )
  }

  function markExtensionContextUnavailable(error) {
    const message = error?.message || String(error || '')
    if (message.includes('Extension context invalidated')) {
      extensionContextAvailable = false
    }
  }

  async function sendRuntimeMessage(message, fallback = null) {
    if (!extensionContextAvailable) return fallback
    try {
      return await chrome.runtime.sendMessage(message)
    } catch (error) {
      markExtensionContextUnavailable(error)
      return fallback
    }
  }

  function appendMainScript() {
    if (mainInjected || !isHttpPage()) return
    mainInjected = true

    const script = document.createElement('script')
    script.src = MAIN_SCRIPT_URL
    script.async = false
    script.dataset.interceptpilotCompat = 'main'
    script.onload = () => script.remove()
    script.onerror = () => script.remove()

    const target = document.documentElement || document.head || document.body
    if (target) {
      target.appendChild(script)
      return
    }

    document.addEventListener('DOMContentLoaded', () => {
      ;(document.documentElement || document.head || document.body)?.appendChild(script)
    }, { once: true })
  }

  async function loadCaptureMode() {
    const response = await sendRuntimeMessage({ type: 'compat:getMode' }, null)
    return response?.captureMode || 'cdp'
  }

  async function enableIfNeeded() {
    if (!isHttpPage()) return
    const mode = await loadCaptureMode()
    if (mode === 'compat') appendMainScript()
  }

  async function handleWindowMessage(event) {
    if (event.source !== window) return
    const message = event.data

    if (isCompatMessage(message, 'request')) {
      const request = message.payload || {}
      if (!request.compatRequestId || !request.url) return
      const response = await sendRuntimeMessage({
        type: 'compat:fetchRequest',
        payload: request
      }, { action: 'passThrough', disabled: true })

      window.postMessage({
        source: 'interceptpilot-compat-bridge',
        type: `${MESSAGE_PREFIX}decision`,
        compatRequestId: request.compatRequestId,
        payload: response || { action: 'passThrough', disabled: true }
      }, '*')
      return
    }

    if (isCompatMessage(message, 'complete')) {
      const payload = message.payload || {}
      if (!payload.compatRequestId) return
      sendRuntimeMessage({ type: 'compat:fetchComplete', payload }).catch(() => {})
      return
    }

    if (isCompatMessage(message, 'error')) {
      const payload = message.payload || {}
      if (!payload.compatRequestId) return
      sendRuntimeMessage({ type: 'compat:fetchError', payload }).catch(() => {})
      return
    }

    if (isCompatMessage(message, 'pageLog')) {
      const payload = message.payload || {}
      sendRuntimeMessage({ type: 'compat:pageLog', payload }).catch(() => {})
    }
  }

  window.addEventListener('message', event => {
    handleWindowMessage(event).catch(error => {
      markExtensionContextUnavailable(error)
    })
  })

  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'compat:modeChanged' && message.captureMode === 'compat') {
      appendMainScript()
      window.postMessage({
        source: 'interceptpilot-compat-bridge',
        type: `${MESSAGE_PREFIX}mode`,
        captureMode: 'compat'
      }, '*')
    }
  })

  enableIfNeeded()
})()
