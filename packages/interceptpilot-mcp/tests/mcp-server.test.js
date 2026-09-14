import test from 'node:test'
import assert from 'node:assert/strict'

import { createToolCallHandler, getMcpToolDefinitions, getMcpToolNames } from '../src/mcp-server.js'
import { ALLOWED_COMMANDS } from '../src/protocol.js'

const EXPECTED_TOOL_NAMES = [
  'list_captured_requests',
  'search_captured_requests',
  'list_collections',
  'list_rules',
  'search_rules',
  'list_sanitized_logs',
  'search_sanitized_logs',
  'list_recent_rule_results',
  'search_rule_results',
  'get_active_collection',
  'get_current_test_context',
  'get_import_bundle_schema',
  'get_import_bundle_examples',
  'explain_rule_match',
  'import_bundle',
  'request_enable_rule',
  'request_disable_rule',
  'request_set_only_active_rule',
  'request_set_active_collection',
  'request_update_rule',
  'request_update_collection',
  'request_delete_rule',
  'request_delete_collection',
  'request_reload_captured_tab',
  'request_start_capture',
  'request_restart_capture',
  'request_stop_capture',
  'request_capture_current_tab',
  'request_set_capture_mode'
]
const SEARCH_TOOL_NAMES = [
  'search_captured_requests',
  'search_rules',
  'search_sanitized_logs',
  'search_rule_results'
]
const STATIC_TOOL_NAMES = [
  'get_import_bundle_schema',
  'get_import_bundle_examples'
]
const REQUIRED_INPUT_TOOL_NAMES = [
  'import_bundle',
  'explain_rule_match',
  'request_enable_rule',
  'request_disable_rule',
  'request_set_only_active_rule',
  'request_set_active_collection',
  'request_update_rule',
  'request_update_collection',
  'request_delete_rule',
  'request_delete_collection',
  'request_set_capture_mode'
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
  const tools = getMcpToolDefinitions().filter(tool => (
    !REQUIRED_INPUT_TOOL_NAMES.includes(tool.name) && !SEARCH_TOOL_NAMES.includes(tool.name)
  ))

  assert.deepEqual(tools.map(tool => tool.name), EXPECTED_TOOL_NAMES.filter(name => (
    !REQUIRED_INPUT_TOOL_NAMES.includes(name) && !SEARCH_TOOL_NAMES.includes(name)
  )))
  for (const tool of tools) {
    assert.deepEqual(tool.inputSchema, {
      type: 'object',
      additionalProperties: false
    })
  }
})

test('MCP search tools declare optional filters and pagination inputs', () => {
  const tools = getMcpToolDefinitions().filter(item => SEARCH_TOOL_NAMES.includes(item.name))

  assert.deepEqual(tools.map(tool => tool.name), SEARCH_TOOL_NAMES)
  for (const tool of tools) {
    assert.equal(tool.inputSchema.type, 'object')
    assert.equal(tool.inputSchema.additionalProperties, false)
    assert.equal(tool.inputSchema.properties.limit.maximum, 100)
    assert.equal(tool.inputSchema.properties.offset.minimum, 0)
    assert.equal(tool.inputSchema.required, undefined)
  }

  const requestTool = tools.find(tool => tool.name === 'search_captured_requests')
  assert.equal(requestTool.inputSchema.properties.method.type, 'string')
  assert.equal(requestTool.inputSchema.properties.intercepted.type, 'boolean')
  assert.equal(requestTool.inputSchema.properties.statusGroup.type, 'string')

  const rulesTool = tools.find(tool => tool.name === 'search_rules')
  assert.equal(rulesTool.inputSchema.properties.collectionId.type, 'string')
  assert.equal(rulesTool.inputSchema.properties.hasConflict.type, 'boolean')
})

test('MCP explain_rule_match tool declares ruleId and requestId inputs', () => {
  const tool = getMcpToolDefinitions().find(item => item.name === 'explain_rule_match')

  assert.match(tool.description, /Compare an InterceptPilot rule with a captured request/)
  assert.deepEqual(tool.inputSchema.required, ['ruleId', 'requestId'])
  assert.equal(tool.inputSchema.properties.ruleId.type, 'string')
  assert.equal(tool.inputSchema.properties.requestId.type, 'string')
  assert.equal(tool.inputSchema.additionalProperties, false)
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

test('MCP rule action request tools declare ruleId input', () => {
  const ruleActionNames = ['request_enable_rule', 'request_disable_rule', 'request_set_only_active_rule']
  const tools = getMcpToolDefinitions().filter(item => ruleActionNames.includes(item.name))

  assert.deepEqual(tools.map(tool => tool.name), ruleActionNames)
  for (const tool of tools) {
    assert.match(tool.description, /requires user confirmation/)
    assert.deepEqual(tool.inputSchema.required, ['ruleId'])
    assert.equal(tool.inputSchema.properties.ruleId.type, 'string')
    assert.equal(tool.inputSchema.additionalProperties, false)
  }
})

test('MCP set active collection tool declares collectionId input', () => {
  const tool = getMcpToolDefinitions().find(item => item.name === 'request_set_active_collection')

  assert.match(tool.description, /active collection/)
  assert.match(tool.description, /requires user confirmation/)
  assert.deepEqual(tool.inputSchema.required, ['collectionId'])
  assert.equal(tool.inputSchema.properties.collectionId.type, 'string')
  assert.equal(tool.inputSchema.additionalProperties, false)
})

test('MCP update request tools declare target, patch and reason inputs', () => {
  const ruleTool = getMcpToolDefinitions().find(item => item.name === 'request_update_rule')
  const collectionTool = getMcpToolDefinitions().find(item => item.name === 'request_update_collection')

  assert.deepEqual(ruleTool.inputSchema.required, ['ruleId', 'patch'])
  assert.equal(ruleTool.inputSchema.properties.ruleId.type, 'string')
  assert.equal(ruleTool.inputSchema.properties.patch.type, 'object')
  assert.equal(ruleTool.inputSchema.properties.reason.type, 'string')
  assert.equal(ruleTool.inputSchema.additionalProperties, false)

  assert.deepEqual(collectionTool.inputSchema.required, ['collectionId', 'patch'])
  assert.equal(collectionTool.inputSchema.properties.collectionId.type, 'string')
  assert.equal(collectionTool.inputSchema.properties.patch.type, 'object')
  assert.equal(collectionTool.inputSchema.properties.reason.type, 'string')
  assert.equal(collectionTool.inputSchema.additionalProperties, false)
})

test('MCP delete request tools declare target inputs', () => {
  const ruleTool = getMcpToolDefinitions().find(item => item.name === 'request_delete_rule')
  const collectionTool = getMcpToolDefinitions().find(item => item.name === 'request_delete_collection')

  assert.deepEqual(ruleTool.inputSchema.required, ['ruleId'])
  assert.equal(ruleTool.inputSchema.properties.ruleId.type, 'string')
  assert.equal(ruleTool.inputSchema.additionalProperties, false)

  assert.deepEqual(collectionTool.inputSchema.required, ['collectionId'])
  assert.equal(collectionTool.inputSchema.properties.collectionId.type, 'string')
  assert.equal(collectionTool.inputSchema.additionalProperties, false)
})

test('MCP reload captured tab tool requires no input and is confirmation-gated', () => {
  const tool = getMcpToolDefinitions().find(item => item.name === 'request_reload_captured_tab')

  assert.ok(tool)
  assert.deepEqual(tool.inputSchema, { type: 'object', additionalProperties: false })
  assert.match(tool.description, /captured tab/)
  assert.match(tool.description, /chrome:\/\//)
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

  for (const name of EXPECTED_TOOL_NAMES.filter(toolName => (
    !REQUIRED_INPUT_TOOL_NAMES.includes(toolName) && !SEARCH_TOOL_NAMES.includes(toolName)
  ))) {
    await handleToolCall(name, { extra: true, bundleJson: 'ignored' })
  }

  assert.deepEqual(calls, EXPECTED_TOOL_NAMES
    .filter(name => !REQUIRED_INPUT_TOOL_NAMES.includes(name) && !SEARCH_TOOL_NAMES.includes(name) && !STATIC_TOOL_NAMES.includes(name))
    .map(command => ({ command, payload: {} })))
})

test('MCP search tools forward safe filter payloads through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return { items: [], total: 0, limit: 25, offset: 0, hasMore: false }
      }
    }
  })

  const result = await handleToolCall('search_captured_requests', {
    method: 'POST',
    intercepted: true,
    limit: 25,
    offset: 0,
    ignored: 'value',
    urlContains: ''
  })

  assert.deepEqual(calls, [{
    command: 'search_captured_requests',
    payload: {
      method: 'POST',
      intercepted: true,
      limit: 25,
      offset: 0
    }
  }])
  assert.equal(result.content[0].type, 'text')
  assert.match(result.content[0].text, /"total": 0/)
})

test('MCP explain_rule_match forwards ruleId and requestId through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          matched: false,
          confidence: 'high',
          summary: 'Rule expects resourceType Fetch, but the request was XHR.'
        }
      }
    }
  })

  const result = await handleToolCall('explain_rule_match', {
    ruleId: 'rule-auth',
    requestId: 'request-auth',
    ignored: 'value'
  })

  assert.deepEqual(calls, [{ command: 'explain_rule_match', payload: { ruleId: 'rule-auth', requestId: 'request-auth' } }])
  assert.equal(result.content[0].type, 'text')
  assert.match(result.content[0].text, /resourceType Fetch/)
})

test('MCP explain_rule_match returns a safe error for invalid payload', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => {
        throw new Error('should not be called')
      }
    }
  })

  const result = await handleToolCall('explain_rule_match', { ruleId: 'rule-auth' })

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /ruleId and requestId are required/)
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

test('MCP rule action tools forward ruleId and format pending proposal result', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          status: 'awaiting_human_confirmation',
          pendingActionId: 'ai-action-1',
          action: 'enable_rule',
          summary: {
            ruleId: 'rule-1',
            ruleName: 'Checkout 200',
            collectionName: 'Checkout'
          }
        }
      }
    }
  })

  const result = await handleToolCall('request_enable_rule', { ruleId: 'rule-1', ignored: true })

  assert.deepEqual(calls, [{ command: 'request_enable_rule', payload: { ruleId: 'rule-1' } }])
  assert.equal(result.content[0].type, 'text')
  assert.match(result.content[0].text, /Rule action proposal sent to InterceptPilot/)
  assert.match(result.content[0].text, /ai-action-1/)
  assert.match(result.content[0].text, /Checkout 200/)
})

test('MCP set active collection tool forwards collectionId and formats proposal result', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          status: 'awaiting_human_confirmation',
          pendingActionId: 'ai-action-collection',
          action: 'set_active_collection',
          summary: {
            collectionId: 'collection-2',
            collectionName: 'Account',
            previousCollectionName: 'Checkout'
          }
        }
      }
    }
  })

  const result = await handleToolCall('request_set_active_collection', { collectionId: 'collection-2', ignored: true })

  assert.deepEqual(calls, [{ command: 'request_set_active_collection', payload: { collectionId: 'collection-2' } }])
  assert.equal(result.content[0].type, 'text')
  assert.match(result.content[0].text, /Rule action proposal sent to InterceptPilot/)
  assert.match(result.content[0].text, /ai-action-collection/)
  assert.match(result.content[0].text, /Account/)
})

test('MCP update tools forward target patch and reason through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          status: 'awaiting_human_confirmation',
          pendingActionId: 'ai-action-update',
          action: command === 'request_update_rule' ? 'update_rule' : 'update_collection',
          summary: {
            ruleName: 'Checkout 200',
            collectionName: 'Checkout',
            diff: [{ field: 'priority', before: 100, after: 300 }]
          }
        }
      }
    }
  })

  const result = await handleToolCall('request_update_rule', {
    ruleId: 'rule-1',
    patch: { priority: 300 },
    reason: 'Raise priority.',
    ignored: true
  })

  assert.deepEqual(calls, [{
    command: 'request_update_rule',
    payload: {
      ruleId: 'rule-1',
      patch: { priority: 300 },
      reason: 'Raise priority.'
    }
  }])
  assert.match(result.content[0].text, /Rule action proposal sent to InterceptPilot/)
  assert.match(result.content[0].text, /ai-action-update/)
})

test('MCP delete tools forward target ids through the bridge', async () => {
  const calls = []
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async (command, payload) => {
        calls.push({ command, payload })
        return {
          status: 'awaiting_human_confirmation',
          pendingActionId: 'ai-action-delete',
          action: command === 'request_delete_rule' ? 'delete_rule' : 'delete_collection',
          summary: { ruleName: 'Checkout 200', collectionName: 'Checkout' }
        }
      }
    }
  })

  const result = await handleToolCall('request_delete_rule', { ruleId: 'rule-1', ignored: true })

  assert.deepEqual(calls, [{ command: 'request_delete_rule', payload: { ruleId: 'rule-1' } }])
  assert.match(result.content[0].text, /Rule action proposal sent to InterceptPilot/)
  assert.match(result.content[0].text, /ai-action-delete/)
})

test('MCP rule action tools return a safe error for missing ruleId', async () => {
  const handleToolCall = createToolCallHandler({
    bridge: {
      callCommand: async () => {
        throw new Error('should not be called')
      }
    }
  })

  const result = await handleToolCall('request_disable_rule', {})

  assert.equal(result.isError, true)
  assert.match(result.content[0].text, /ruleId must be a non-empty string/)
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
