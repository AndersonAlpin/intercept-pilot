const DEFAULT_BODY = '{\n  "ok": true\n}'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function decodeBase64(text) {
  if (typeof atob === 'function') return atob(text)
  return Buffer.from(String(text || ''), 'base64').toString('utf8')
}

async function waitForFinishedEntry(entry, { waitMs, intervalMs, sleep, getEntry }) {
  const currentEntry = () => (typeof getEntry === 'function' ? getEntry() : null) || entry
  let current = currentEntry()
  if (current?.endedAt || current?.errorText || current?.responseBodyLoaded === 'loaded') return current
  const startedAt = Date.now()
  while (!current?.endedAt && !current?.errorText && current?.responseBodyLoaded !== 'loaded' && Date.now() - startedAt < waitMs) {
    await sleep(intervalMs)
    current = currentEntry()
  }
  return current
}

export async function resolveNetworkEntryResponseBody(entry, options = {}) {
  const {
    fetchBody,
    getEntry,
    waitMs = 1200,
    intervalMs = 50,
    sleep = delay
  } = options

  let current = (typeof getEntry === 'function' ? getEntry() : null) || entry

  if (current?.responseBodyLoaded === 'loaded') {
    return {
      body: String(current.responseBody || ''),
      base64Encoded: Boolean(current.responseBodyBase64Encoded),
      source: 'entry'
    }
  }

  if (current?.source === 'compat') {
    current = await waitForFinishedEntry(current, { waitMs, intervalMs, sleep, getEntry })
    if (current?.responseBodyLoaded === 'loaded') {
      return {
        body: String(current.responseBody || ''),
        base64Encoded: false,
        source: 'compat'
      }
    }
    return {
      body: typeof current?.responseBody === 'string' ? current.responseBody : '',
      base64Encoded: false,
      source: 'compat'
    }
  }

  current = await waitForFinishedEntry(current, { waitMs, intervalMs, sleep, getEntry })

  try {
    const requestId = current?.networkId || current?.requestId
    if (!requestId || typeof fetchBody !== 'function') throw new Error('body_unavailable')
    const result = await fetchBody(requestId)
    const rawBody = String(result?.body || '')
    return {
      body: result?.base64Encoded ? decodeBase64(rawBody) : rawBody,
      base64Encoded: Boolean(result?.base64Encoded),
      source: 'cdp'
    }
  } catch {
    if (typeof current?.responseBody === 'string') {
      return { body: current.responseBody, base64Encoded: false, source: 'entry-fallback' }
    }
    return { body: DEFAULT_BODY, base64Encoded: false, source: 'fallback' }
  }
}
