import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { ALLOWED_COMMANDS, isAllowedCommand } from './protocol.js'

const IMPORT_BUNDLE_INPUT_DESCRIPTION = 'InterceptPilot import bundle JSON string. The extension will create a pending proposal and wait for user confirmation.'
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

function normalizeToolArguments(args = {}) {
  return args && typeof args === 'object' ? args : {}
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
    buildPayload: normalizeToolArguments,
    formatResult: createTextResult
  }
}

const MCP_TOOLS = {
  list_captured_requests: createReadOnlyTool('List sanitized captured requests from the active InterceptPilot capture context.'),
  list_collections: createReadOnlyTool('List InterceptPilot collections with safe summary fields.'),
  list_rules: createReadOnlyTool('List InterceptPilot rules with safe summary fields, without response bodies or headers.'),
  get_active_collection: createReadOnlyTool('Get the active InterceptPilot collection summary.'),
  import_bundle: {
    description: 'Send an InterceptPilot import bundle to the extension as a pending proposal. The user must confirm it in the Full App before anything is applied.',
    jsonInputSchema: IMPORT_BUNDLE_JSON_INPUT_SCHEMA,
    registeredInputSchema: {
      bundleJson: z.string().min(1).describe(IMPORT_BUNDLE_INPUT_DESCRIPTION)
    },
    buildPayload: buildImportBundlePayload,
    formatResult: createImportProposalResult
  }
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
