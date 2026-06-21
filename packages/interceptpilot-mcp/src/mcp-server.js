import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getImportBundleExamples, getImportBundleSchema } from './import-bundle-schema.js'
import { ALLOWED_COMMANDS, isAllowedCommand } from './protocol.js'

const IMPORT_BUNDLE_INPUT_DESCRIPTION = 'A JSON string containing an InterceptPilot import bundle. It can be either a single rule bundle with type "interceptpilot.rule" or a collection bundle with type "interceptpilot.collection". The extension will create a pending proposal and wait for user confirmation.'
const RULE_ID_INPUT_DESCRIPTION = 'The InterceptPilot rule id to compare against a captured request.'
const RULE_ACTION_RULE_ID_INPUT_DESCRIPTION = 'The existing InterceptPilot rule id to use for the pending rule action proposal.'
const COLLECTION_ACTION_COLLECTION_ID_INPUT_DESCRIPTION = 'The existing InterceptPilot collection id to use for the pending collection action proposal.'
const REQUEST_ID_INPUT_DESCRIPTION = 'The captured request/network entry id to compare against the rule.'
const EMPTY_JSON_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false
}
const IMPORT_BUNDLE_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    bundleJson: {
      type: 'string',
      description: IMPORT_BUNDLE_INPUT_DESCRIPTION
    }
  },
  required: ['bundleJson'],
  additionalProperties: false
}
const EXPLAIN_RULE_MATCH_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    ruleId: {
      type: 'string',
      description: RULE_ID_INPUT_DESCRIPTION
    },
    requestId: {
      type: 'string',
      description: REQUEST_ID_INPUT_DESCRIPTION
    }
  },
  required: ['ruleId', 'requestId'],
  additionalProperties: false
}
const RULE_ACTION_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    ruleId: {
      type: 'string',
      description: RULE_ACTION_RULE_ID_INPUT_DESCRIPTION
    }
  },
  required: ['ruleId'],
  additionalProperties: false
}
const COLLECTION_ACTION_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    collectionId: {
      type: 'string',
      description: COLLECTION_ACTION_COLLECTION_ID_INPUT_DESCRIPTION
    }
  },
  required: ['collectionId'],
  additionalProperties: false
}
const UPDATE_RULE_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    ruleId: {
      type: 'string',
      description: RULE_ACTION_RULE_ID_INPUT_DESCRIPTION
    },
    patch: {
      type: 'object',
      description: 'Safe fields to update on the existing InterceptPilot rule. responseBody and responseHeaders are not allowed by this tool.'
    },
    reason: {
      type: 'string',
      description: 'Short reason shown to the user in the InterceptPilot confirmation modal.'
    }
  },
  required: ['ruleId', 'patch'],
  additionalProperties: false
}
const UPDATE_COLLECTION_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    collectionId: {
      type: 'string',
      description: 'The existing InterceptPilot collection id to update.'
    },
    patch: {
      type: 'object',
      description: 'Safe fields to update on the existing InterceptPilot collection.'
    },
    reason: {
      type: 'string',
      description: 'Short reason shown to the user in the InterceptPilot confirmation modal.'
    }
  },
  required: ['collectionId', 'patch'],
  additionalProperties: false
}
const DELETE_RULE_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    ruleId: {
      type: 'string',
      description: RULE_ACTION_RULE_ID_INPUT_DESCRIPTION
    }
  },
  required: ['ruleId'],
  additionalProperties: false
}
const DELETE_COLLECTION_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    collectionId: {
      type: 'string',
      description: 'The existing InterceptPilot collection id to delete after human confirmation.'
    }
  },
  required: ['collectionId'],
  additionalProperties: false
}
const PAGINATION_INPUT_PROPERTIES = {
  limit: {
    type: 'number',
    minimum: 1,
    maximum: 100
  },
  offset: {
    type: 'number',
    minimum: 0
  }
}
const REQUEST_SEARCH_INPUT_PROPERTIES = {
  method: { type: 'string' },
  status: { type: 'number' },
  statusGroup: { type: 'string' },
  resourceType: { type: 'string' },
  urlContains: { type: 'string' },
  pathContains: { type: 'string' },
  origin: { type: 'string' },
  matchedRuleId: { type: 'string' },
  matchedRuleName: { type: 'string' },
  intercepted: { type: 'boolean' },
  appliedAction: { type: 'string' },
  hasError: { type: 'boolean' },
  since: { type: 'string' },
  ...PAGINATION_INPUT_PROPERTIES
}
const LOG_SEARCH_INPUT_PROPERTIES = {
  level: { type: 'string' },
  scope: { type: 'string' },
  messageContains: { type: 'string' },
  urlContains: { type: 'string' },
  since: { type: 'string' },
  ...PAGINATION_INPUT_PROPERTIES
}
const RULE_RESULT_SEARCH_INPUT_PROPERTIES = {
  ruleId: { type: 'string' },
  ruleName: { type: 'string' },
  method: { type: 'string' },
  resourceType: { type: 'string' },
  status: { type: 'number' },
  appliedAction: { type: 'string' },
  intercepted: { type: 'boolean' },
  matched: { type: 'boolean' },
  urlContains: { type: 'string' },
  pathContains: { type: 'string' },
  since: { type: 'string' },
  ...PAGINATION_INPUT_PROPERTIES
}
const RULE_SEARCH_INPUT_PROPERTIES = {
  collectionId: { type: 'string' },
  enabled: { type: 'boolean' },
  method: { type: 'string' },
  resourceType: { type: 'string' },
  matchType: { type: 'string' },
  urlPatternContains: { type: 'string' },
  actionType: { type: 'string' },
  nameContains: { type: 'string' },
  hasConflict: { type: 'boolean' },
  lastError: { type: 'boolean' },
  ...PAGINATION_INPUT_PROPERTIES
}
const REQUEST_SEARCH_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: REQUEST_SEARCH_INPUT_PROPERTIES,
  additionalProperties: false
}
const LOG_SEARCH_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: LOG_SEARCH_INPUT_PROPERTIES,
  additionalProperties: false
}
const RULE_RESULT_SEARCH_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: RULE_RESULT_SEARCH_INPUT_PROPERTIES,
  additionalProperties: false
}
const RULE_SEARCH_JSON_INPUT_SCHEMA = {
  type: 'object',
  properties: RULE_SEARCH_INPUT_PROPERTIES,
  additionalProperties: false
}

function createEmptyPayload() {
  return {}
}

function createTextResult(result) {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }
    ]
  }
}

function createSafeToolError(error) {
  return {
    isError: true,
    content: [
      {
        type: 'text',
        text: String(error?.message || 'InterceptPilot MCP tool failed.')
      }
    ]
  }
}

function buildImportBundlePayload(args = {}) {
  const bundleJson = args?.bundleJson
  if (typeof bundleJson !== 'string' || !bundleJson.trim()) {
    throw new Error('bundleJson must be a JSON string.')
  }
  return { bundleJson }
}

function buildExplainRuleMatchPayload(args = {}) {
  const ruleId = args?.ruleId
  const requestId = args?.requestId
  if (typeof ruleId !== 'string' || !ruleId.trim() || typeof requestId !== 'string' || !requestId.trim()) {
    throw new Error('ruleId and requestId are required strings.')
  }
  return {
    ruleId,
    requestId
  }
}

function buildRuleActionPayload(args = {}) {
  const ruleId = args?.ruleId
  if (typeof ruleId !== 'string' || !ruleId.trim()) {
    throw new Error('ruleId must be a non-empty string.')
  }
  return { ruleId }
}

function buildCollectionActionPayload(args = {}) {
  const collectionId = args?.collectionId
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw new Error('collectionId must be a non-empty string.')
  }
  return { collectionId }
}

function buildUpdateRulePayload(args = {}) {
  const ruleId = args?.ruleId
  const patch = args?.patch
  if (typeof ruleId !== 'string' || !ruleId.trim() || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('ruleId and patch are required.')
  }
  return {
    ruleId,
    patch,
    ...(typeof args.reason === 'string' && args.reason.trim() ? { reason: args.reason } : {})
  }
}

function buildUpdateCollectionPayload(args = {}) {
  const collectionId = args?.collectionId
  const patch = args?.patch
  if (typeof collectionId !== 'string' || !collectionId.trim() || !patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('collectionId and patch are required.')
  }
  return {
    collectionId,
    patch,
    ...(typeof args.reason === 'string' && args.reason.trim() ? { reason: args.reason } : {})
  }
}

function buildDeleteRulePayload(args = {}) {
  const ruleId = args?.ruleId
  if (typeof ruleId !== 'string' || !ruleId.trim()) {
    throw new Error('ruleId must be a non-empty string.')
  }
  return { ruleId }
}

function buildDeleteCollectionPayload(args = {}) {
  const collectionId = args?.collectionId
  if (typeof collectionId !== 'string' || !collectionId.trim()) {
    throw new Error('collectionId must be a non-empty string.')
  }
  return { collectionId }
}

function buildAllowedPayload(args = {}, allowedKeys = []) {
  const allowed = new Set(allowedKeys)
  return Object.fromEntries(
    Object.entries(args || {}).filter(([key, value]) => (
      allowed.has(key) && value !== undefined && value !== null && value !== ''
    ))
  )
}

function createImportProposalResult(result = {}) {
  if (result.status === 'applied') {
    const summary = result.summary || {}
    return {
      content: [
        {
          type: 'text',
          text: [
            'Import bundle applied in InterceptPilot.',
            'Approval: session_permission.',
            summary.collectionName ? `Collection: ${summary.collectionName}` : '',
            summary.ruleName ? `Rule: ${summary.ruleName}` : '',
            Number.isFinite(Number(summary.ruleCount)) ? `Rules: ${summary.ruleCount}` : ''
          ].filter(Boolean).join('\n')
        }
      ]
    }
  }
  const summary = result.summary || {}
  const lines = [
    'Import proposal sent to InterceptPilot.',
    'The user must confirm it in the Full App before anything is applied.',
    result.pendingImportId ? `Pending import: ${result.pendingImportId}` : '',
    summary.collectionName ? `Collection: ${summary.collectionName}` : '',
    summary.ruleName ? `Rule: ${summary.ruleName}` : '',
    Number.isFinite(Number(summary.ruleCount)) ? `Rules: ${summary.ruleCount}` : ''
  ].filter(Boolean)

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n')
      }
    ]
  }
}

function createRuleActionProposalResult(result = {}) {
  if (result.status === 'applied') {
    const summary = result.summary || {}
    return {
      content: [
        {
          type: 'text',
          text: [
            'Rule action applied in InterceptPilot.',
            'Approval: session_permission.',
            result.action ? `Action: ${result.action}` : '',
            summary.ruleName ? `Rule: ${summary.ruleName}` : '',
            summary.collectionName ? `Collection: ${summary.collectionName}` : ''
          ].filter(Boolean).join('\n')
        }
      ]
    }
  }
  const summary = result.summary || {}
  const lines = [
    'Rule action proposal sent to InterceptPilot.',
    'The user must confirm it in the Full App before anything is applied.',
    result.pendingActionId ? `Pending action: ${result.pendingActionId}` : '',
    result.action ? `Action: ${result.action}` : '',
    summary.ruleName ? `Rule: ${summary.ruleName}` : '',
    summary.collectionName ? `Collection: ${summary.collectionName}` : '',
    Number.isFinite(Number(summary.affectedRuleCount)) ? `Affected rules: ${summary.affectedRuleCount}` : ''
  ].filter(Boolean)

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n')
      }
    ]
  }
}

function createReadOnlyTool(description) {
  return {
    description,
    jsonInputSchema: EMPTY_JSON_INPUT_SCHEMA,
    registeredInputSchema: {},
    buildPayload: createEmptyPayload,
    formatResult: createTextResult
  }
}

function createSearchTool(description, jsonInputSchema) {
  const registeredInputSchema = Object.fromEntries(Object.entries(jsonInputSchema.properties || {}).map(([key, schema]) => {
    const base = schema.type === 'number'
      ? z.number()
      : schema.type === 'boolean' ? z.boolean() : z.string()
    return [key, base.optional()]
  }))

  return {
    description,
    jsonInputSchema,
    registeredInputSchema,
    buildPayload: args => buildAllowedPayload(args, Object.keys(jsonInputSchema.properties || {})),
    formatResult: createTextResult
  }
}

function createStaticReadOnlyTool(description, getResult) {
  return {
    description,
    jsonInputSchema: EMPTY_JSON_INPUT_SCHEMA,
    registeredInputSchema: {},
    buildPayload: createEmptyPayload,
    formatResult: createTextResult,
    getResult
  }
}

function createReloadProposalResult(result = {}) {
  if (result.status === 'applied') {
    const summary = result.summary || {}
    return {
      content: [
        {
          type: 'text',
          text: [
            'Captured tab reload applied in InterceptPilot.',
            'Approval: session_permission.',
            summary.origin ? `Origin: ${summary.origin}` : '',
            summary.path ? `Path: ${summary.path}` : ''
          ].filter(Boolean).join('\n')
        }
      ]
    }
  }
  const summary = result.summary || {}
  const lines = [
    'Captured tab reload proposal sent to InterceptPilot.',
    'The user must confirm it in the Full App before the tab is reloaded.',
    result.pendingActionId ? `Pending action: ${result.pendingActionId}` : '',
    summary.origin ? `Origin: ${summary.origin}` : '',
    summary.path ? `Path: ${summary.path}` : ''
  ].filter(Boolean)

  return {
    content: [
      {
        type: 'text',
        text: lines.join('\n')
      }
    ]
  }
}

function createRuleActionTool(description) {
  return {
    description,
    jsonInputSchema: RULE_ACTION_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      ruleId: z.string().min(1).describe(RULE_ACTION_RULE_ID_INPUT_DESCRIPTION)
    },
    buildPayload: buildRuleActionPayload,
    formatResult: createRuleActionProposalResult
  }
}

function createCollectionActionTool(description) {
  return {
    description,
    jsonInputSchema: COLLECTION_ACTION_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      collectionId: z.string().min(1).describe(COLLECTION_ACTION_COLLECTION_ID_INPUT_DESCRIPTION)
    },
    buildPayload: buildCollectionActionPayload,
    formatResult: createRuleActionProposalResult
  }
}

function createUpdateRuleTool(description) {
  return {
    description,
    jsonInputSchema: UPDATE_RULE_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      ruleId: z.string().min(1).describe(RULE_ACTION_RULE_ID_INPUT_DESCRIPTION),
      patch: z.object({}).passthrough().describe('Safe rule patch.'),
      reason: z.string().optional().describe('Reason shown in the confirmation modal.')
    },
    buildPayload: buildUpdateRulePayload,
    formatResult: createRuleActionProposalResult
  }
}

function createUpdateCollectionTool(description) {
  return {
    description,
    jsonInputSchema: UPDATE_COLLECTION_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      collectionId: z.string().min(1).describe('The existing InterceptPilot collection id to update.'),
      patch: z.object({}).passthrough().describe('Safe collection patch.'),
      reason: z.string().optional().describe('Reason shown in the confirmation modal.')
    },
    buildPayload: buildUpdateCollectionPayload,
    formatResult: createRuleActionProposalResult
  }
}

function createDeleteRuleTool(description) {
  return {
    description,
    jsonInputSchema: DELETE_RULE_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      ruleId: z.string().min(1).describe(RULE_ACTION_RULE_ID_INPUT_DESCRIPTION)
    },
    buildPayload: buildDeleteRulePayload,
    formatResult: createRuleActionProposalResult
  }
}

function createDeleteCollectionTool(description) {
  return {
    description,
    jsonInputSchema: DELETE_COLLECTION_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      collectionId: z.string().min(1).describe('The existing InterceptPilot collection id to delete after human confirmation.')
    },
    buildPayload: buildDeleteCollectionPayload,
    formatResult: createRuleActionProposalResult
  }
}

const MCP_TOOLS = {
  list_captured_requests: createReadOnlyTool('List sanitized requests captured in the active InterceptPilot capture context. Useful for identifying endpoints to mock. Does not include headers, bodies, cookies, Authorization values, or query parameter values.'),
  search_captured_requests: createSearchTool('Search sanitized requests captured in the active InterceptPilot capture context using safe filters and pagination. Does not include headers, bodies, cookies, Authorization values, or query parameter values unless the corresponding AI Bridge permission is enabled.', REQUEST_SEARCH_JSON_INPUT_SCHEMA),
  list_collections: createReadOnlyTool('List InterceptPilot collections with safe summary fields and rule counts. Useful for understanding available scenario groups. Does not include headers, bodies, cookies, tokens, or query parameter values.'),
  list_rules: createReadOnlyTool('List InterceptPilot rules with sanitized match/action summaries. Useful for understanding existing mocks and failures. Does not include response bodies, raw headers, cookies, Authorization values, or query parameter values.'),
  search_rules: createSearchTool('Search InterceptPilot rules using safe metadata, match, action, and diagnostics filters. Does not include response bodies, raw headers, cookies, Authorization values, or query parameter values.', RULE_SEARCH_JSON_INPUT_SCHEMA),
  list_sanitized_logs: createReadOnlyTool('List sanitized recent logs from the active InterceptPilot capture context. Useful for diagnosing page or capture issues. Does not include raw stack traces, headers, bodies, cookies, Authorization values, or query parameter values.'),
  search_sanitized_logs: createSearchTool('Search sanitized recent logs from the active InterceptPilot capture context using safe filters and pagination. Does not include raw stack traces, headers, bodies, cookies, Authorization values, or query parameter values unless the corresponding AI Bridge permission is enabled.', LOG_SEARCH_JSON_INPUT_SCHEMA),
  list_recent_rule_results: createReadOnlyTool('List sanitized recent rule result summaries from the active InterceptPilot capture context. Useful for seeing which rules matched, which action applied, and whether requests were intercepted. Does not include headers, bodies, cookies, Authorization values, or query parameter values.'),
  search_rule_results: createSearchTool('Search sanitized recent rule result summaries using safe filters and pagination. Useful for finding which rule applied to a specific request or why a rule did not match. Does not include headers, bodies, cookies, Authorization values, or query parameter values.', RULE_RESULT_SEARCH_JSON_INPUT_SCHEMA),
  get_active_collection: createReadOnlyTool('Get the active InterceptPilot collection summary and rule counts. Useful before proposing scenarios for the current collection. Does not include headers, bodies, cookies, tokens, or query parameter values.'),
  get_current_test_context: createReadOnlyTool('Get the current sanitized InterceptPilot test context, including capture status, capture mode, active tab origin/path, active collection summary, rule counts, and AI Bridge status. Does not include full URLs with query values, headers, bodies, cookies, or tab title.'),
  get_import_bundle_schema: createStaticReadOnlyTool('Return the static InterceptPilot import bundle schema, supported bundle types, allowed enum values, and guidance for creating rule or collection bundles. Does not require the extension to be connected and does not alter state.', getImportBundleSchema),
  get_import_bundle_examples: createStaticReadOnlyTool('Return safe static examples of InterceptPilot rule and collection import bundles. Useful as references before calling import_bundle. Does not require the extension to be connected and does not alter state.', getImportBundleExamples),
  explain_rule_match: {
    description: 'Compare an InterceptPilot rule with a captured request and return a sanitized diagnostic explaining why the rule matches or why it likely did not apply. Does not expose headers, bodies, cookies, Authorization values, or query parameter values.',
    jsonInputSchema: EXPLAIN_RULE_MATCH_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      ruleId: z.string().min(1).describe(RULE_ID_INPUT_DESCRIPTION),
      requestId: z.string().min(1).describe(REQUEST_ID_INPUT_DESCRIPTION)
    },
    buildPayload: buildExplainRuleMatchPayload,
    formatResult: createTextResult
  },
  import_bundle: {
    description: 'Send an InterceptPilot rule or collection import bundle to the extension as a pending proposal. Supports bundles with type "interceptpilot.rule" or "interceptpilot.collection". The user must confirm it in the Full App before anything is applied.',
    jsonInputSchema: IMPORT_BUNDLE_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      bundleJson: z.string().min(1).describe(IMPORT_BUNDLE_INPUT_DESCRIPTION)
    },
    buildPayload: buildImportBundlePayload,
    formatResult: createImportProposalResult
  },
  request_enable_rule: createRuleActionTool('Request enabling an existing InterceptPilot rule. This creates a pending action proposal in the Full App and requires user confirmation before the rule is enabled.'),
  request_disable_rule: createRuleActionTool('Request disabling an existing InterceptPilot rule. This creates a pending action proposal in the Full App and requires user confirmation before the rule is disabled.'),
  request_set_only_active_rule: createRuleActionTool('Request making one rule the only active rule in its collection. This creates a pending action proposal in the Full App and requires user confirmation before enabling the selected rule and disabling the others in the same collection.'),
  request_set_active_collection: createCollectionActionTool('Request making an existing InterceptPilot collection the active collection. This creates a pending action proposal in the Full App and requires user confirmation before the active collection changes, unless the session allows rule and collection actions without confirmation.'),
  request_update_rule: createUpdateRuleTool('Request updating safe fields on an existing InterceptPilot rule. This creates a pending action proposal in the Full App with a before/after diff and requires user confirmation before anything is changed. It does not allow responseBody or responseHeaders edits.'),
  request_update_collection: createUpdateCollectionTool('Request updating safe fields on an existing InterceptPilot collection. This creates a pending action proposal in the Full App with a before/after diff and requires user confirmation before anything is changed.'),
  request_delete_rule: createDeleteRuleTool('Request deleting an existing InterceptPilot rule. This always creates a pending action proposal in the Full App and requires human confirmation before anything is removed.'),
  request_delete_collection: createDeleteCollectionTool('Request deleting an existing InterceptPilot collection. This always creates a pending action proposal in the Full App, shows the affected rule count, and requires human confirmation before anything is removed.'),
  request_reload_captured_tab: {
    description: 'Request reloading only the InterceptPilot captured tab so a mock or rule change can be validated. Creates a pending action proposal in the Full App that the user must confirm, unless the captured-tab reload session permission is enabled. Never reloads an arbitrary or internal (chrome://, extension://) page and does not change capture mode or debugger state.',
    jsonInputSchema: EMPTY_JSON_INPUT_SCHEMA,
    registeredInputSchema: {},
    buildPayload: createEmptyPayload,
    formatResult: createReloadProposalResult
  }
}

export function getMcpToolNames() {
  return Object.keys(MCP_TOOLS)
}

export function getMcpToolDefinitions() {
  return Object.entries(MCP_TOOLS).map(([name, tool]) => ({
    name,
    description: tool.description,
    inputSchema: tool.jsonInputSchema
  }))
}

export function createToolCallHandler({ bridge }) {
  return async function handleToolCall(name, args = {}) {
    try {
      const tool = MCP_TOOLS[name]
      if (!tool || !isAllowedCommand(name)) {
        throw new Error('Unknown InterceptPilot MCP tool.')
      }

      const payload = tool.buildPayload(args)
      if (tool.getResult) {
        return tool.formatResult(tool.getResult(payload))
      }

      const result = await bridge.callCommand(name, payload)
      if (result?.error) throw new Error(result.error.message || 'InterceptPilot MCP tool failed.')
      return tool.formatResult(result)
    } catch (error) {
      return createSafeToolError(error)
    }
  }
}

export function createMcpServer({ bridge }) {
  const server = new McpServer({
    name: 'interceptpilot-mcp',
    version: '0.0.0'
  })
  const handleToolCall = createToolCallHandler({ bridge })

  for (const tool of getMcpToolDefinitions()) {
    server.registerTool(tool.name, {
      title: tool.name,
      description: tool.description,
      inputSchema: MCP_TOOLS[tool.name].registeredInputSchema
    }, args => handleToolCall(tool.name, args))
  }

  return server
}
