import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { getImportBundleExamples, getImportBundleSchema } from './import-bundle-schema.js'
import { ALLOWED_COMMANDS, isAllowedCommand } from './protocol.js'

const IMPORT_BUNDLE_INPUT_DESCRIPTION = 'A JSON string containing an InterceptPilot import bundle. It can be either a single rule bundle with type "interceptpilot.rule" or a collection bundle with type "interceptpilot.collection". The extension will create a pending proposal and wait for user confirmation.'
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

function createImportProposalResult(result = {}) {
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

function createReadOnlyTool(description) {
  return {
    description,
    jsonInputSchema: EMPTY_JSON_INPUT_SCHEMA,
    registeredInputSchema: {},
    buildPayload: createEmptyPayload,
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

const MCP_TOOLS = {
  list_captured_requests: createReadOnlyTool('List sanitized requests captured in the active InterceptPilot capture context. Useful for identifying endpoints to mock. Does not include headers, bodies, cookies, Authorization values, or query parameter values.'),
  list_collections: createReadOnlyTool('List InterceptPilot collections with safe summary fields and rule counts. Useful for understanding available scenario groups. Does not include headers, bodies, cookies, tokens, or query parameter values.'),
  list_rules: createReadOnlyTool('List InterceptPilot rules with sanitized match/action summaries. Useful for understanding existing mocks and failures. Does not include response bodies, raw headers, cookies, Authorization values, or query parameter values.'),
  list_sanitized_logs: createReadOnlyTool('List sanitized recent logs from the active InterceptPilot capture context. Useful for diagnosing page or capture issues. Does not include raw stack traces, headers, bodies, cookies, Authorization values, or query parameter values.'),
  list_recent_rule_results: createReadOnlyTool('List sanitized recent rule result summaries from the active InterceptPilot capture context. Useful for seeing which rules matched, which action applied, and whether requests were intercepted. Does not include headers, bodies, cookies, Authorization values, or query parameter values.'),
  get_active_collection: createReadOnlyTool('Get the active InterceptPilot collection summary and rule counts. Useful before proposing scenarios for the current collection. Does not include headers, bodies, cookies, tokens, or query parameter values.'),
  get_current_test_context: createReadOnlyTool('Get the current sanitized InterceptPilot test context, including capture status, capture mode, active tab origin/path, active collection summary, rule counts, and AI Bridge status. Does not include full URLs with query values, headers, bodies, cookies, or tab title.'),
  get_import_bundle_schema: createStaticReadOnlyTool('Return the static InterceptPilot import bundle schema, supported bundle types, allowed enum values, and guidance for creating rule or collection bundles. Does not require the extension to be connected and does not alter state.', getImportBundleSchema),
  get_import_bundle_examples: createStaticReadOnlyTool('Return safe static examples of InterceptPilot rule and collection import bundles. Useful as references before calling import_bundle. Does not require the extension to be connected and does not alter state.', getImportBundleExamples),
  import_bundle: {
    description: 'Send an InterceptPilot rule or collection import bundle to the extension as a pending proposal. Supports bundles with type "interceptpilot.rule" or "interceptpilot.collection". The user must confirm it in the Full App before anything is applied.',
    jsonInputSchema: IMPORT_BUNDLE_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      bundleJson: z.string().min(1).describe(IMPORT_BUNDLE_INPUT_DESCRIPTION)
    },
    buildPayload: buildImportBundlePayload,
    formatResult: createImportProposalResult
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
