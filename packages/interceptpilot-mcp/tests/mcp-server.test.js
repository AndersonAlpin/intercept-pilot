import test from 'node:test'
import assert from 'node:assert/strict'

import { createToolCallHandler, getMcpToolDefinitions } from '../src/mcp-server.js'

test('MCP server exposes only the read-only InterceptPilot tools', () => {
  assert.deepEqual(getMcpToolDefinitions().map(tool => tool.name), [
    'list_captured_requests',
    'list_collections',
    'list_rules',
    'get_active_collection'
  ])
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

  await assert.rejects(
    handleToolCall('enable_rule', {}),
    /Unknown InterceptPilot MCP tool/
  )
})
