import { ACTION_TYPES, FAIL_REASONS, MATCH_TYPES, METHODS, RESOURCE_TYPES } from './constants.js'

export function validateRule(rule) {
  const errors = []
  if (!rule?.name?.trim()) errors.push('ruleNameRequired')
  if (!rule?.match?.urlPattern?.trim()) errors.push('urlPatternRequired')
  if (!METHODS.includes(rule?.match?.method || 'ANY')) errors.push('invalidMethod')
  if (!RESOURCE_TYPES.includes(rule?.match?.resourceType || 'ANY')) errors.push('invalidResourceType')
  if (!MATCH_TYPES.includes(rule?.match?.matchType || 'contains')) errors.push('invalidMatchType')
  if (!ACTION_TYPES.includes(rule?.action?.type || 'mockResponse')) errors.push('invalidActionType')

  if (rule?.match?.matchType === 'regex') {
    try {
      new RegExp(rule.match.urlPattern)
    } catch {
      errors.push('invalidRegex')
    }
  }

  const statusCode = Number(rule?.action?.statusCode ?? 200)
  if (statusCode < 100 || statusCode > 599) errors.push('invalidStatusCode')

  const delayMs = Number(rule?.action?.delayMs ?? 0)
  if (delayMs < 0) errors.push('invalidDelay')

  if (!FAIL_REASONS.includes(rule?.action?.failReason || 'Failed')) errors.push('invalidFailReason')

  const contentType = String(rule?.action?.contentType || '').toLowerCase()
  const responseBody = String(rule?.action?.responseBody || '')
  if (contentType.includes('application/json') && responseBody.trim()) {
    try {
      JSON.parse(responseBody)
    } catch {
      errors.push('invalidResponseBodyJson')
    }
  }

  return errors
}
