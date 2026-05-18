function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`
}

function isUsableHeader(header) {
  if (!header?.name) return false
  // HTTP/2 pseudo-headers (:method, :path, :authority, :scheme, :status)
  // arent valid for curl/fetch and are already implicit in the URL/method.
  if (String(header.name).startsWith(':')) return false
  return true
}

export function entryToCurl(entry) {
  if (!entry?.url) return ''
  const parts = [`curl ${shellQuote(entry.url)}`]
  if (entry.method && String(entry.method).toUpperCase() !== 'GET') {
    parts.push(`-X ${entry.method}`)
  }
  for (const header of entry.requestHeaders || []) {
    if (!isUsableHeader(header)) continue
    parts.push(`-H ${shellQuote(`${header.name}: ${header.value || ''}`)}`)
  }
  if (entry.requestPostData) {
    parts.push(`--data-raw ${shellQuote(entry.requestPostData)}`)
  }
  return parts.join(' \\\n  ')
}

export function entryToFetch(entry) {
  if (!entry?.url) return ''
  const init = {
    method: entry.method || 'GET',
    headers: Object.fromEntries(
      (entry.requestHeaders || [])
        .filter(isUsableHeader)
        .map(h => [h.name, h.value || ''])
    )
  }
  if (entry.requestPostData) init.body = entry.requestPostData
  return `fetch(${JSON.stringify(entry.url)}, ${JSON.stringify(init, null, 2)})`
}
