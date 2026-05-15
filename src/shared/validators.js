import { ACTION_TYPES, FAIL_REASONS, MATCH_TYPES, METHODS, RESOURCE_TYPES } from './constants.js'

export function validateRule(rule) {
  const errors = []
  if (!rule?.name?.trim()) errors.push('Rule name is required.')
  if (!rule?.match?.urlPattern?.trim()) errors.push('URL pattern is required.')
  if (!METHODS.includes(rule?.match?.method || 'ANY')) errors.push('Invalid method.')
  if (!RESOURCE_TYPES.includes(rule?.match?.resourceType || 'ANY')) errors.push('Invalid resource type.')
  if (!MATCH_TYPES.includes(rule?.match?.matchType || 'contains')) errors.push('Invalid match type.')
  if (!ACTION_TYPES.includes(rule?.action?.type || 'mockResponse')) errors.push('Invalid action type.')

  if (rule?.match?.matchType === 'regex') {
    try {
      new RegExp(rule.match.urlPattern)
    } catch {
      errors.push('Invalid regex pattern.')
    }
  }

  const statusCode = Number(rule?.action?.statusCode ?? 200)
  if (statusCode < 100 || statusCode > 599) errors.push('Status code must be between 100 and 599.')

  const delayMs = Number(rule?.action?.delayMs ?? 0)
  if (delayMs < 0) errors.push('Delay must be >= 0.')

  if (!FAIL_REASONS.includes(rule?.action?.failReason || 'Failed')) errors.push('Invalid fail reason.')

  const contentType = String(rule?.action?.contentType || '').toLowerCase()
  const responseBody = String(rule?.action?.responseBody || '')
  if (contentType.includes('application/json') && responseBody.trim()) {
    try {
      JSON.parse(responseBody)
    } catch {
      errors.push('Response body must be valid JSON for application/json content type.')
    }
  }

  return errors
}
