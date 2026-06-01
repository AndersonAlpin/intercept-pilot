import { isHttpUrl } from '../shared/utils.js'

function normalizeResourceType(type) {
  const value = String(type || '').toLowerCase()
  if (value === 'xmlhttprequest') return 'xhr'
  return value || 'resource'
}

export function normalizePerformanceEntries(entries = [], context = {}) {
  const now = Number(context.now || Date.now())
  const timeOrigin = Number(context.timeOrigin || now)
  const tabId = context.tabId || null

  return (Array.isArray(entries) ? entries : [])
    .map((entry, index) => {
      const url = String(entry?.name || '')
      if (!isHttpUrl(url)) return null
      const startOffset = Number(entry.startTime || 0)
      const duration = Math.max(0, Number(entry.duration || 0))
      const startedAt = Math.round(timeOrigin + startOffset)
      const endedAt = Math.round(startedAt + duration)
      const status = Number(entry.responseStatus || 0) || null
      return {
        id: `performance:${tabId || 'tab'}:${startedAt}:${index}`,
        requestId: `performance:${index}`,
        networkId: `performance:${index}`,
        url,
        method: 'GET',
        status,
        statusText: '',
        resourceType: normalizeResourceType(entry.initiatorType),
        startedAt,
        endedAt,
        durationMs: duration,
        matchedRuleId: null,
        matchedRuleName: null,
        appliedAction: 'passThrough',
        intercepted: false,
        responseHeaders: [],
        responseMimeType: '',
        errorText: '',
        requestHeaders: [],
        requestPostData: null,
        requestPostDataTruncated: false,
        errorType: '',
        timing: null,
        documentUrl: context.documentUrl || '',
        responseBody: null,
        responseBodyBase64Encoded: false,
        responseBodyTruncated: false,
        responseBodyLoaded: 'idle',
        source: 'performance',
        captureSessionId: context.captureSessionId || null,
        networkCycleId: context.networkCycleId || null,
        networkTabId: tabId,
        transferSize: Number(entry.transferSize || 0)
      }
    })
    .filter(Boolean)
}
