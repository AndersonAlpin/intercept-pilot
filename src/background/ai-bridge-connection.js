import { AI_BRIDGE_STATUS, DEFAULT_AI_BRIDGE_PORT } from '../shared/ai-bridge-state.js'
import {
  explainRuleMatchCommand,
  getActiveCollection,
  getCurrentTestContext,
  listCapturedRequests,
  listCollections,
  listRecentRuleResults,
  listRules,
  listSanitizedLogs,
  searchCapturedRequests,
  searchRuleResults,
  searchRules,
  searchSanitizedLogs
} from './ai-bridge-commands.js'

const BRIDGE_SOURCE = 'interceptpilot-extension'
const BRIDGE_PROTOCOL_VERSION = 1
const DEFAULT_RECONNECT_DELAY_MS = 1500

const ALLOWED_COMMANDS = {
  list_captured_requests: listCapturedRequests,
  search_captured_requests: searchCapturedRequests,
  list_collections: listCollections,
  list_rules: listRules,
  search_rules: searchRules,
  list_sanitized_logs: listSanitizedLogs,
  search_sanitized_logs: searchSanitizedLogs,
  list_recent_rule_results: listRecentRuleResults,
  search_rule_results: searchRuleResults,
  explain_rule_match: explainRuleMatchCommand,
  get_active_collection: getActiveCollection,
  get_current_test_context: getCurrentTestContext
}

const WRITE_PROPOSAL_COMMANDS = new Set(['import_bundle'])
const RULE_ACTION_PROPOSAL_COMMANDS = {
  request_enable_rule: 'enable_rule',
  request_disable_rule: 'disable_rule',
  request_set_only_active_rule: 'set_only_active_rule',
  request_update_rule: 'update_rule',
  request_update_collection: 'update_collection',
  request_delete_rule: 'delete_rule',
  request_delete_collection: 'delete_collection'
}
const TAB_ACTION_PROPOSAL_COMMANDS = new Set(['request_reload_captured_tab'])

const COMMAND_NOT_ALLOWED_ERROR = {
  code: 'UNKNOWN_COMMAND',
  message: 'Command is not allowed.'
}

function isActiveSession(session = {}) {
  return session.status !== AI_BRIDGE_STATUS.disabled
}

function getSessionPort(session = {}) {
  const port = Number(session.port || DEFAULT_AI_BRIDGE_PORT)
  return Number.isFinite(port) && port > 0 ? port : DEFAULT_AI_BRIDGE_PORT
}

function parseMessage(raw) {
  try {
    return JSON.parse(String(raw ?? ''))
  } catch {
    return null
  }
}

export function createAiBridgeConnection(options = {}) {
  const {
    WebSocketCtor = globalThis.WebSocket,
    getSession,
    getConnectionKey = () => '',
    markConnected,
    markWaiting,
    getCommandContext,
    importBundle,
    requestRuleAction,
    requestReload,
    onSessionChange = () => {},
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    reconnectDelayMs = DEFAULT_RECONNECT_DELAY_MS
  } = options

  let socket = null
  let reconnectTimer = null
  let closingIntentionally = false
  let handshakeAccepted = false

  function clearReconnect() {
    if (!reconnectTimer) return
    clearTimeoutFn(reconnectTimer)
    reconnectTimer = null
  }

  function send(message) {
    if (!socket || typeof socket.send !== 'function') return
    socket.send(JSON.stringify(message))
  }

  function sendCommandError(id, error = COMMAND_NOT_ALLOWED_ERROR) {
    send({
      id,
      type: 'command:error',
      ok: false,
      error
    })
  }

  function scheduleReconnect() {
    if (reconnectTimer) return
    reconnectTimer = setTimeoutFn(() => {
      reconnectTimer = null
      sync()
    }, reconnectDelayMs)
  }

  async function handleCommand(message) {
    const id = String(message?.id || '')
    const command = String(message?.command || '')
    if (!id || (!ALLOWED_COMMANDS[command] && !WRITE_PROPOSAL_COMMANDS.has(command) && !RULE_ACTION_PROPOSAL_COMMANDS[command] && !TAB_ACTION_PROPOSAL_COMMANDS.has(command))) {
      sendCommandError(id, COMMAND_NOT_ALLOWED_ERROR)
      return
    }

    try {
      if (command === 'import_bundle') {
        const result = await importBundle(message.payload || {})
        if (result?.error) {
          sendCommandError(id, result.error)
          return
        }
        send({
          id,
          type: 'command:result',
          ok: true,
          result
        })
        return
      }

      if (RULE_ACTION_PROPOSAL_COMMANDS[command]) {
        const result = await requestRuleAction(RULE_ACTION_PROPOSAL_COMMANDS[command], message.payload || {})
        if (result?.error) {
          sendCommandError(id, result.error)
          return
        }
        send({
          id,
          type: 'command:result',
          ok: true,
          result
        })
        return
      }

      if (TAB_ACTION_PROPOSAL_COMMANDS.has(command)) {
        const result = await requestReload(message.payload || {})
        if (result?.error) {
          sendCommandError(id, result.error)
          return
        }
        send({
          id,
          type: 'command:result',
          ok: true,
          result
        })
        return
      }

      const context = await getCommandContext()
      send({
        id,
        type: 'command:result',
        ok: true,
        result: ALLOWED_COMMANDS[command]({
          ...context,
          payload: message.payload || {}
        })
      })
    } catch {
      sendCommandError(id, {
        code: 'COMMAND_FAILED',
        message: 'Command failed.'
      })
    }
  }

  function handleMessage(event) {
    const message = parseMessage(event?.data)
    if (!message) return

    if (message.type === 'hello:ack' && message.ok === true && Number(message.version) === BRIDGE_PROTOCOL_VERSION) {
      handshakeAccepted = true
      onSessionChange(markConnected())
      return
    }

    if (message.type === 'pong') return
    if (message.type === 'ping') {
      if (handshakeAccepted) send({ type: 'pong' })
      return
    }

    if (message.type === 'command') {
      if (!handshakeAccepted) return
      handleCommand(message)
    }
  }

  function connect(session) {
    if (!WebSocketCtor || socket) return

    const connectionKey = String(getConnectionKey() || '')
    if (!connectionKey) return

    const url = `ws://127.0.0.1:${getSessionPort(session)}`
    closingIntentionally = false
    handshakeAccepted = false
    socket = new WebSocketCtor(url)

    socket.onopen = () => {
      send({
        type: 'hello',
        source: BRIDGE_SOURCE,
        key: connectionKey,
        version: BRIDGE_PROTOCOL_VERSION
      })
    }
    socket.onmessage = handleMessage
    socket.onerror = () => {
      if (socket && typeof socket.close === 'function') socket.close()
    }
    socket.onclose = () => {
      socket = null
      handshakeAccepted = false
      if (closingIntentionally) return
      if (!isActiveSession(getSession())) return
      onSessionChange(markWaiting())
      scheduleReconnect()
    }
  }

  function sync() {
    clearReconnect()
    const session = getSession()
    if (!isActiveSession(session)) {
      disconnect()
      return
    }
    connect(session)
  }

  function disconnect() {
    clearReconnect()
    closingIntentionally = true
    handshakeAccepted = false
    const current = socket
    socket = null
    if (current && typeof current.close === 'function') current.close()
  }

  return {
    sync,
    disconnect
  }
}
