export const BRIDGE_HOST = '127.0.0.1'
export const BRIDGE_PORT = 37177
export const BRIDGE_PROTOCOL_VERSION = 1
export const BRIDGE_SOURCE = 'interceptpilot-extension'

export const MESSAGE_TYPES = {
  hello: 'hello',
  helloAck: 'hello:ack',
  command: 'command',
  commandResult: 'command:result',
  commandError: 'command:error'
}

export const ALLOWED_COMMANDS = Object.freeze([
  'list_captured_requests',
  'list_collections',
  'list_rules',
  'list_sanitized_logs',
  'list_recent_rule_results',
  'get_active_collection',
  'get_current_test_context',
  'get_import_bundle_schema',
  'get_import_bundle_examples',
  'explain_rule_match',
  'import_bundle'
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

export function createCommandMessage(id, command, payload = {}) {
  return {
    id,
    type: MESSAGE_TYPES.command,
    command,
    payload
  }
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
  const token = String(message.token || '')
  const expectedToken = String(options.expectedToken || '')
  const ok = message.type === MESSAGE_TYPES.hello
    && message.source === BRIDGE_SOURCE
    && Number(message.version) === BRIDGE_PROTOCOL_VERSION
    && Boolean(token)
    && (!expectedToken || token === expectedToken)

  if (!ok) {
    return {
      ok: false,
      error: 'Invalid InterceptPilot hello message.'
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
