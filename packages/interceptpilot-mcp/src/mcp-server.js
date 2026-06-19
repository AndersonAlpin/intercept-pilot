import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { ALLOWED_COMMANDS, isAllowedCommand } from './protocol.js'

const TOOL_DESCRIPTIONS = {
  list_captured_requests: 'List sanitized captured requests from the active InterceptPilot capture context.',
  list_collections: 'List InterceptPilot collections with safe summary fields.',
  list_rules: 'List InterceptPilot rules with safe summary fields, without response bodies or headers.',
  get_active_collection: 'Get the active InterceptPilot collection summary.'
}

export function getMcpToolDefinitions() {
  return ALLOWED_COMMANDS.map(name => ({
    name,
    description: TOOL_DESCRIPTIONS[name],
    inputSchema: {
      type: 'object',
      additionalProperties: false
    }
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

export function createToolCallHandler({ bridge }) {
  return async function handleToolCall(name, args = {}) {
    if (!isAllowedCommand(name)) {
      throw new Error('Unknown InterceptPilot MCP tool.')
    }

    try {
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
      inputSchema: {}
    }, args => handleToolCall(tool.name, args))
  }

  return server
}
