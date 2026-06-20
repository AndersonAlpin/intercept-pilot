import test from 'node:test'
import assert from 'node:assert/strict'

import { createToolCallHandler, getMcpToolDefinitions, getMcpToolNames } from '../src/mcp-server.js'
import { ALLOWED_COMMANDS } from '../src/protocol.js'

const EXPECTED_TOOL_NAMES = [
  'list_captured_requests',
  'list_collections',
  'list_rules',
  'list_sanitized_logs',
  'list_recent_rule_results',
  'get_active_collection',
  'get_current_test_context',
  'get_import_bundle_schema',
  'get_import_bundle_examples',
  'import_bundle'
]
const STATIC_TOOL_NAMES = [
  'get_import_bundle_schema',
  'get_import_bundle_examples'
]

test('MCP server exposes the allowed InterceptPilot tools', () => {
  assert.deepEqual(getMcpToolNames(), EXPECTED_TOOL_NAMES)
  assert.deepEqual(getMcpToolDefinitions().map(tool => tool.name), EXPECTED_TOOL_NAMES)
})

test('MCP tool definitions stay synchronized with the protocol allowlist', () => {
  assert.deepEqual(getMcpToolNames().filter(name => !ALLOWED_COMMANDS.includes(name)), [])
  assert.deepEqual(ALLOWED_COMMANDS.filter(name => !getMcpToolNames().includes(name)), [])
  assert.deepEqual(getMcpToolNames(), ALLOWED_COMMANDS)
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

  assert.match(tool.description, /interceptpilot\.rule/)
  assert.match(tool.description, /interceptpilot\.collection/)
  assert.deepEqual(tool.inputSchema.required, ['bundleJson'])
  assert.equal(tool.inputSchema.properties.bundleJson.type, 'string')
  assert.match(tool.inputSchema.properties.bundleJson.description, /interceptpilot\.rule/)
  assert.match(tool.inputSchema.properties.bundleJson.description, /interceptpilot\.collection/)
  assert.equal(tool.inputSchema.additionalProperties, false)
})

test('MCP read-only tool handlers always forward empty payloads', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return [{ id: 'rule-1', name: 'Rule 1' }]
      }
    }
  })

  const result = await handleToolCall('list_rules', { unexpected: 'ignored' })

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

test('MCP all read-only tools ignore programmatic arguments', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return []
      }
    }
  })

  for (const name of EXPECTED_TOOL_NAMES.filter(toolName => toolName !== 'import_bundle')) {
    await handleToolCall(name, { extra: true, bundleJson: 'ignored' })
  }

  assert.deepEqual(calls, EXPECTED_TOOL_NAMES
    .filter(name => name !== 'import_bundle' && !STATIC_TOOL_NAMES.includes(name))
    .map(command => ({ command, payload: {} })))
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

test('MCP get_import_bundle_schema returns static schema details without extension connection', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        throw new Error('Extension should not be called')
      }
    }
  })

  const result = await handleToolCall('get_import_bundle_schema', { ignored: true })
  const schema = JSON.parse(result.content[0].text)

  assert.equal(result.isError, undefined)
  assert.deepEqual(calls, [])
  assert.equal(schema.schemaVersion, 1)
  assert.deepEqual(schema.supportedTypes, ['interceptpilot.rule', 'interceptpilot.collection'])
  assert.deepEqual(schema.allowedValues.matchType, ['contains', 'equals', 'regex', 'glob'])
  assert.deepEqual(schema.allowedValues.resourceType, ['ANY', 'XHR', 'Fetch', 'Document', 'Script', 'Image', 'Stylesheet', 'Other'])
  assert.equal(schema.ruleBundleShape.type, 'interceptpilot.rule')
  assert.equal(schema.collectionBundleShape.type, 'interceptpilot.collection')
  const guidance = schema.guidance.join(' ')
  assert.match(guidance, /resourceType "ANY"/)
  assert.match(guidance, /failRequest only for network-level failures/)
  assert.match(guidance, /Location header/)
})

test('MCP get_import_bundle_examples returns safe rule and collection examples locally', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        throw new Error('Extension should not be called')
      }
    }
  })

  const result = await handleToolCall('get_import_bundle_examples', {})
  const examples = JSON.parse(result.content[0].text)

  assert.equal(result.isError, undefined)
  assert.deepEqual(calls, [])
  assert.equal(examples.length, 5)
  assert.equal(examples.some(example => example.bundle.type === 'interceptpilot.rule'), true)
  assert.equal(examples.some(example => example.bundle.type === 'interceptpilot.collection'), true)
  assert.equal(examples.some(example => example.bundle.rule?.action?.type === 'failRequest'), true)
  assert.equal(examples.some(example => example.bundle.rule?.action?.type === 'delayOnly'), true)

  const everyRule = examples.flatMap(example => (
    example.bundle.type === 'interceptpilot.collection'
      ? example.bundle.rules
      : [example.bundle.rule]
  ))

  for (const rule of everyRule) {
    assert.equal(rule.match.resourceType, 'ANY')
    if (Object.hasOwn(rule.action, 'responseBody')) {
      assert.equal(typeof rule.action.responseBody, 'string')
    }
  }

  assert.doesNotMatch(JSON.stringify(examples), /pandavideo|Authorization|Cookie|Bearer|token=/i)
})

test('MCP extension-backed tools still return clear disconnected errors', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => {
        throw new Error('InterceptPilot extension is not connected. Open InterceptPilot settings and start an AI Bridge session.')
      }
    }
  })

  const result = await handleToolCall('list_rules', {})

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /extension is not connected/)
})
