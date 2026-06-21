export const BRIDGE_HOST = '127.0.0.1'
export const BRIDGE_PORT = 37177
export const BRIDGE_PROTOCOL_VERSION = 1
export const BRIDGE_SOURCE = 'interceptpilot-extension'
export const MCP_CLIENT_SOURCE = 'interceptpilot-mcp-client'

export const MESSAGE_TYPES = {
  hello: 'hello',
  helloAck: 'hello:ack',
  command: 'command',
  commandResult: 'command:result',
  commandError: 'command:error',
  clientHello: 'client:hello',
  clientHelloAck: 'client:hello:ack',
  clientCommand: 'client:command',
  clientResult: 'client:result',
  clientError: 'client:error',
  ping: 'ping',
  pong: 'pong'
}

export const ALLOWED_COMMANDS = Object.freeze([
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
  'request_update_rule',
  'request_update_collection',
  'request_delete_rule',
  'request_delete_collection',
  'request_reload_captured_tab'
])

const ALLOWED_COMMAND_SET = new Set(ALLOWED_COMMANDS)

export function isAllowedCommand(command) {
  return ALLOWED_COMMAND_SET.has(String(command || ''))
}

export function createHelloAckMessage() {
  return {
    type: MESSAGE_TYPES.helloAck,
    ok: true,
    version: BRIDGE_PROTOCOL_VERSION
  }
}

export function createClientHelloAckMessage() {
  return {
    type: MESSAGE_TYPES.clientHelloAck,
    ok: true,
    version: BRIDGE_PROTOCOL_VERSION
  }
}

export function createCommandMessage(id, command, payload = {}) {
  return {
    id,
    type: MESSAGE_TYPES.command,
    command,
    payload
  }
}

export function createPingMessage() {
  return { type: MESSAGE_TYPES.ping }
}

export function parseBridgeMessage(raw) {
  try {
    const text = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw ?? '')
    const message = JSON.parse(text)
    return message && typeof message === 'object' ? message : null
  } catch {
    return null
  }
}

export function validateHelloMessage(message = {}, options = {}) {
  const key = String(message.key || '')
  const expectedKey = String(options.expectedKey || '')
  const ok = message.type === MESSAGE_TYPES.hello
    && message.source === BRIDGE_SOURCE
    && Number(message.version) === BRIDGE_PROTOCOL_VERSION
    && Boolean(key)
    && (!expectedKey || key === expectedKey)

  if (!ok) {
    return {
      ok: false,
      error: 'Invalid InterceptPilot hello message.'
    }
  }

  return { ok: true }
}

export function validateClientHelloMessage(message = {}, options = {}) {
  const key = String(message.key || '')
  const expectedKey = String(options.expectedKey || '')
  const ok = message.type === MESSAGE_TYPES.clientHello
    && message.source === MCP_CLIENT_SOURCE
    && Number(message.version) === BRIDGE_PROTOCOL_VERSION
    && Boolean(key)
    && (!expectedKey || key === expectedKey)

  if (!ok) {
    return {
      ok: false,
      error: 'Invalid InterceptPilot client hello message.'
    }
  }

  return { ok: true }
}

export function isCommandResponse(message = {}) {
  return Boolean(
    message
      && typeof message.id === 'string'
      && [MESSAGE_TYPES.commandResult, MESSAGE_TYPES.commandError].includes(message.type)
  )
}

export function isClientResponse(message = {}) {
  return Boolean(
    message
      && typeof message.id === 'string'
      && [MESSAGE_TYPES.clientResult, MESSAGE_TYPES.clientError].includes(message.type)
  )
}
