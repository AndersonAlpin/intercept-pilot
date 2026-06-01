const DEFAULT_BODY = '{\n  "ok": true\n}'

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function decodeBase64(text) {
  if (typeof atob === 'function') return atob(text)
  return Buffer.from(String(text || ''), 'base64').toString('utf8')
}

async function waitForFinishedEntry(entry, { waitMs, intervalMs, sleep }) {
  if (entry?.endedAt || entry?.errorText || entry?.responseBodyLoaded === 'loaded') return
  const startedAt = Date.now()
  while (!entry.endedAt && !entry.errorText && Date.now() - startedAt < waitMs) {
    await sleep(intervalMs)
  }
}

export async function resolveNetworkEntryResponseBody(entry, options = {}) {
  const {
    fetchBody,
    waitMs = 1200,
    intervalMs = 50,
    sleep = delay
  } = options

  if (entry?.responseBodyLoaded === 'loaded') {
    return {
      body: String(entry.responseBody || ''),
      base64Encoded: Boolean(entry.responseBodyBase64Encoded),
      source: 'entry'
    }
  }

  if (entry?.source === 'compat') {
    return {
      body: typeof entry.responseBody === 'string' ? entry.responseBody : '',
      base64Encoded: false,
      source: 'compat'
    }
  }

  await waitForFinishedEntry(entry, { waitMs, intervalMs, sleep })

  try {
    const requestId = entry?.networkId || entry?.requestId
    if (!requestId || typeof fetchBody !== 'function') throw new Error('body_unavailable')
    const result = await fetchBody(requestId)
    const rawBody = String(result?.body || '')
    return {
      body: result?.base64Encoded ? decodeBase64(rawBody) : rawBody,
      base64Encoded: Boolean(result?.base64Encoded),
      source: 'cdp'
    }
  } catch {
    if (typeof entry?.responseBody === 'string') {
      return { body: entry.responseBody, base64Encoded: false, source: 'entry-fallback' }
    }
    return { body: DEFAULT_BODY, base64Encoded: false, source: 'fallback' }
  }
}
