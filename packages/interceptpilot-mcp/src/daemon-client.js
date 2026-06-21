import WebSocket from 'ws'

import {
  BRIDGE_HOST,
  BRIDGE_PORT,
  BRIDGE_PROTOCOL_VERSION,
  MCP_CLIENT_SOURCE,
  MESSAGE_TYPES,
  isAllowedCommand,
  isClientResponse,
  parseBridgeMessage
} from './protocol.js'
import { startDaemonProcess as defaultStartDaemonProcess } from './process-manager.js'

const DEFAULT_REQUEST_TIMEOUT_MS = 5000
const DEFAULT_RETRY_DELAY_MS = 100
const DEFAULT_MAX_PENDING_REQUESTS = 25
const DEFAULT_MAX_CONNECT_ATTEMPTS = 30
const TIMEOUT_MESSAGE = 'InterceptPilot did not respond in time.'
const DISCONNECTED_MESSAGE = 'InterceptPilot daemon disconnected.'
const COMMAND_NOT_ALLOWED_MESSAGE = 'Command is not allowed.'
const TOO_MANY_PENDING_MESSAGE = 'Too many pending InterceptPilot requests.'
const DAEMON_NOT_RUNNING_MESSAGE = 'InterceptPilot daemon is not running. Start AI Bridge or run without --no-daemon-autostart.'
const DAEMON_START_FAILED_MESSAGE = 'Unable to start InterceptPilot daemon.'

function createDefaultLogger() {
  return {
    info: message => console.error(`[interceptpilot-mcp] ${message}`),
    warn: message => console.error(`[interceptpilot-mcp] ${message}`),
    error: message => console.error(`[interceptpilot-mcp] ${message}`)
  }
}

function addSocketListener(socket, event, handler) {
  if (typeof socket.on === 'function') {
    socket.on(event, handler)
    return
  }
  socket[`on${event}`] = handler
}

function sendJson(socket, message) {
  socket.send(JSON.stringify(message))
}

function createSafeError(message) {
  return new Error(message)
}

function getMessageData(raw) {
  if (raw && typeof raw === 'object' && 'data' in raw) return raw.data
  return raw
}

export function createDaemonClientBridge(options = {}) {
  const {
    WebSocketCtor = WebSocket,
    host = BRIDGE_HOST,
    port = BRIDGE_PORT,
    expectedKey = '',
    daemonAutostart = true,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    maxPendingRequests = DEFAULT_MAX_PENDING_REQUESTS,
    maxConnectAttempts = DEFAULT_MAX_CONNECT_ATTEMPTS,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    idGenerator,
    clientId = 'interceptpilot-mcp',
    logger = createDefaultLogger(),
    startDaemonProcess = defaultStartDaemonProcess,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout
  } = options

  const connectionKey = String(expectedKey || '')
  const pending = new Map()
  let socket = null
  let connected = false
  let requestSeq = 0
  let startPromise = null

  function nextRequestId() {
    if (idGenerator) return idGenerator()
    requestSeq += 1
    return `client_req_${requestSeq}`
  }

  function isConnected() {
    return Boolean(socket && connected)
  }

  function rejectPending(message) {
    for (const [, request] of pending) {
      clearTimeoutFn(request.timer)
      request.reject(createSafeError(message))
    }
    pending.clear()
  }

  function handleResponse(message) {
    if (!isClientResponse(message)) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    clearTimeoutFn(request.timer)

    if (message.type === MESSAGE_TYPES.clientError || message.ok === false) {
      request.reject(createSafeError(String(message.error?.message || 'InterceptPilot command failed.')))
      return
    }

    request.resolve(message.result)
  }

  function handleSocketClose(activeSocket) {
    if (socket !== activeSocket) return
    connected = false
    socket = null
    startPromise = null
    rejectPending(DISCONNECTED_MESSAGE)
  }

  function schedule(fn) {
    if (retryDelayMs <= 0) {
      fn()
      return
    }
    const timer = setTimeoutFn(fn, retryDelayMs)
    timer?.unref?.()
  }

  function connectAttempt(resolve, reject, attempt = 1, autostartTried = false) {
    let settled = false
    const activeSocket = new WebSocketCtor(`ws://${host}:${port}`)
    socket = activeSocket

    function failStart(message) {
      settled = true
      socket = null
      connected = false
      startPromise = null
      reject(createSafeError(message))
    }

    function retryAfterAutostart() {
      schedule(() => connectAttempt(resolve, reject, attempt + 1, true))
    }

    addSocketListener(activeSocket, 'open', () => {
      if (settled) return
      sendJson(activeSocket, {
        type: MESSAGE_TYPES.clientHello,
        source: MCP_CLIENT_SOURCE,
        key: connectionKey,
        version: BRIDGE_PROTOCOL_VERSION,
        clientId
      })
    })

    addSocketListener(activeSocket, 'message', raw => {
      const message = parseBridgeMessage(getMessageData(raw))
      if (!message) return

      if (message.type === MESSAGE_TYPES.clientHelloAck && message.ok === true && Number(message.version) === BRIDGE_PROTOCOL_VERSION) {
        settled = true
        connected = true
        resolve()
        return
      }

      handleResponse(message)
    })

    addSocketListener(activeSocket, 'error', () => {
      if (connected || settled) return
      settled = true
      socket = null

      if (!daemonAutostart) {
        failStart(DAEMON_NOT_RUNNING_MESSAGE)
        return
      }

      if (!autostartTried) {
        try {
          startDaemonProcess({ port, key: connectionKey, logger })
        } catch {
          failStart(DAEMON_START_FAILED_MESSAGE)
          return
        }
        retryAfterAutostart()
        return
      }

      if (attempt < maxConnectAttempts) {
        retryAfterAutostart()
        return
      }

      failStart(DAEMON_START_FAILED_MESSAGE)
    })

    addSocketListener(activeSocket, 'close', () => {
      if (!connected && !settled) {
        settled = true
        socket = null
        if (!daemonAutostart) {
          failStart(DAEMON_NOT_RUNNING_MESSAGE)
          return
        }
        if (!autostartTried) {
          try {
            startDaemonProcess({ port, key: connectionKey, logger })
          } catch {
            failStart(DAEMON_START_FAILED_MESSAGE)
            return
          }
          retryAfterAutostart()
          return
        }
        failStart(DAEMON_START_FAILED_MESSAGE)
        return
      }
      handleSocketClose(activeSocket)
    })
  }

  function start() {
    if (isConnected()) return Promise.resolve()
    if (startPromise) return startPromise
    startPromise = new Promise((resolve, reject) => {
      connectAttempt(resolve, reject)
    })
    return startPromise
  }

  async function close() {
    rejectPending(DISCONNECTED_MESSAGE)
    connected = false
    startPromise = null
    if (socket && typeof socket.close === 'function') socket.close()
    socket = null
  }

  function callCommand(command, payload = {}) {
    if (!isAllowedCommand(command)) {
      return Promise.reject(createSafeError(COMMAND_NOT_ALLOWED_MESSAGE))
    }
    if (!isConnected()) {
      return Promise.reject(createSafeError(DAEMON_NOT_RUNNING_MESSAGE))
    }
    if (pending.size >= maxPendingRequests) {
      return Promise.reject(createSafeError(TOO_MANY_PENDING_MESSAGE))
    }

    const id = nextRequestId()
    const message = {
      id,
      type: MESSAGE_TYPES.clientCommand,
      command,
      payload: payload && typeof payload === 'object' ? payload : {}
    }

    return new Promise((resolve, reject) => {
      const timer = setTimeoutFn(() => {
        pending.delete(id)
        reject(createSafeError(TIMEOUT_MESSAGE))
      }, requestTimeoutMs)
      timer?.unref?.()
      pending.set(id, { resolve, reject, timer })
      sendJson(socket, message)
    })
  }

  return {
    start,
    close,
    callCommand,
    isConnected,
    getPendingCount: () => pending.size
  }
}
