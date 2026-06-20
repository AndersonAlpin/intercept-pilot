import test from 'node:test'
import assert from 'node:assert/strict'

import { createToolCallHandler, getMcpToolDefinitions } from '../src/mcp-server.js'
import { ALLOWED_COMMANDS } from '../src/protocol.js'

const EXPECTED_TOOL_NAMES = [
  'list_captured_requests',
  'list_collections',
  'list_rules',
  'get_active_collection',
  'import_bundle'
]

test('MCP server exposes the allowed InterceptPilot tools', () => {
  assert.deepEqual(getMcpToolDefinitions().map(tool => tool.name), EXPECTED_TOOL_NAMES)
})

test('MCP tool definitions stay synchronized with the protocol allowlist', () => {
  assert.deepEqual(getMcpToolDefinitions().map(tool => tool.name), ALLOWED_COMMANDS)
})

test('MCP read-only tools do not require input', () => {
  const tools = getMcpToolDefinitions().filter(tool => tool.name !== 'import_bundle')

  assert.deepEqual(tools.map(tool => tool.name), EXPECTED_TOOL_NAMES.filter(name => name !== 'import_bundle'))
  for (const tool of tools) {
    assert.deepEqual(tool.inputSchema, {
      type: 'object',
      additionalProperties: false
    })
  }
})

test('MCP import_bundle tool declares bundleJson input', () => {
  const tool = getMcpToolDefinitions().find(item => item.name === 'import_bundle')

  assert.deepEqual(tool.inputSchema.required, ['bundleJson'])
  assert.equal(tool.inputSchema.properties.bundleJson.type, 'string')
  assert.equal(tool.inputSchema.additionalProperties, false)
})

test('MCP tool handler forwards allowed tool calls through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return [{ id: 'rule-1', name: 'Rule 1' }]
      }
    }
  })

  const result = await handleToolCall('list_rules', {})

  assert.deepEqual(calls, [{ command: 'list_rules', payload: {} }])
  assert.deepEqual(result, {
    content: [
      {
        type: 'text',
        text: JSON.stringify([{ id: 'rule-1', name: 'Rule 1' }], null, 2)
      }
    ]
  })
})

test('MCP tool handler rejects unknown tools safely', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => []
    }
  })

  const result = await handleToolCall('enable_rule', {})

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /Unknown InterceptPilot MCP tool/)
})

test('MCP import_bundle forwards bundleJson through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          status: 'awaiting_human_confirmation',
          pendingImportId: 'ai-import-1',
          summary: {
            type: 'interceptpilot.collection',
            collectionName: 'Checkout',
            ruleCount: 2
          }
        }
      }
    }
  })

  const result = await handleToolCall('import_bundle', { bundleJson: '{"schemaVersion":1}' })

  assert.deepEqual(calls, [{ command: 'import_bundle', payload: { bundleJson: '{"schemaVersion":1}' } }])
  assert.equal(result.content[0].type, 'text')
  assert.match(result.content[0].text, /Import proposal sent to InterceptPilot/)
  assert.match(result.content[0].text, /ai-import-1/)
})

test('MCP import_bundle returns a safe error for invalid payload', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => {
        throw new Error('should not be called')
      }
    }
  })

  const result = await handleToolCall('import_bundle', {})

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /bundleJson must be a JSON string/)
})

test('MCP import_bundle returns a safe error when extension rejects the bundle', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => ({
        error: {
          code: 'INVALID_JSON',
          message: 'Import bundle JSON is invalid.'
        }
      })
    }
  })

  const result = await handleToolCall('import_bundle', { bundleJson: '{bad json' })

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /Import bundle JSON is invalid/)
})
