export const RULE_STATES = ['ready', 'matched', 'disabled', 'error', 'conflict']

export function getRuleState(rule, options = {}) {
  const captureActive = options.captureActive !== false
  if (!rule) return 'ready'
  if (!rule.enabled) return 'disabled'
  if (rule.diagnostics?.lastError) return 'error'
  if (rule.diagnostics?.conflictIds?.length) return 'conflict'
  const last = rule.diagnostics?.lastMatchedAt
  if (last && captureActive) return 'matched'
  return 'ready'
}
