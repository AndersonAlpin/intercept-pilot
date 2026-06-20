import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { ALLOWED_COMMANDS, isAllowedCommand } from './protocol.js'

const TOOL_DESCRIPTIONS = {
  list_captured_requests: 'List sanitized captured requests from the active InterceptPilot capture context.',
  list_collections: 'List InterceptPilot collections with safe summary fields.',
  list_rules: 'List InterceptPilot rules with safe summary fields, without response bodies or headers.',
  get_active_collection: 'Get the active InterceptPilot collection summary.',
  import_bundle: 'Send an InterceptPilot import bundle to the extension as a pending proposal. The user must confirm it in the Full App before anything is applied.'
}

const IMPORT_BUNDLE_INPUT_SCHEMA = {
  bundleJson: z.string().min(1).describe('InterceptPilot import bundle JSON string. The extension will create a pending proposal and wait for user confirmation.')
}

function getToolJsonInputSchema(name) {
  if (name !== 'import_bundle') {
    return {
      type: 'object',
      additionalProperties: false
    }
  }

  return {
    type: 'object',
    properties: {
      bundleJson: {
        type: 'string',
        description: 'InterceptPilot import bundle JSON string. The extension will create a pending proposal and wait for user confirmation.'
      }
    },
    required: ['bundleJson'],
    additionalProperties: false
  }
}

function getRegisteredInputSchema(name) {
  if (name === 'import_bundle') return IMPORT_BUNDLE_INPUT_SCHEMA
  return {}
}

export function getMcpToolDefinitions() {
  return ALLOWED_COMMANDS.map(name => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    inputSchema: getToolJsonInputSchema(name)
  }))
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

function validateImportBundleArgs(args = {}) {
  const bundleJson = args?.bundleJson
  if (typeof bundleJson !== 'string' || !bundleJson.trim()) {
    return {
      error: 'bundleJson must be a JSON string.'
    }
  }
  return {
    payload: { bundleJson }
  }
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

export function createToolCallHandler({ bridge }) {
  return async function handleToolCall(name, args = {}) {
    if (!isAllowedCommand(name)) {
      throw new Error('Unknown InterceptPilot MCP tool.')
    }

    try {
      if (name === 'import_bundle') {
        const validation = validateImportBundleArgs(args)
        if (validation.error) throw new Error(validation.error)
        const result = await bridge.callCommand(name, validation.payload)
        if (result?.error) throw new Error(result.error.message || 'InterceptPilot import proposal failed.')
        return createImportProposalResult(result)
      }

      const result = await bridge.callCommand(name, normalizeToolArguments(args))
      return createTextResult(result)
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
      inputSchema: getRegisteredInputSchema(tool.name)
    }, args => handleToolCall(tool.name, args))
  }

  return server
}
