import { WebSocketServer } from 'ws'

import {
  BRIDGE_HOST,
  BRIDGE_PORT,
  MESSAGE_TYPES,
  createCommandMessage,
  createHelloAckMessage,
  createPingMessage,
  isAllowedCommand,
  isCommandResponse,
  parseBridgeMessage,
  validateHelloMessage
} from './protocol.js'

const DEFAULT_REQUEST_TIMEOUT_MS = 5000
const DEFAULT_HEARTBEAT_INTERVAL_MS = 20000
const DEFAULT_MAX_PENDING_REQUESTS = 25
const NOT_CONNECTED_MESSAGE = 'InterceptPilot extension is not connected. Open InterceptPilot settings and start an AI Bridge session.'
const TIMEOUT_MESSAGE = 'InterceptPilot did not respond in time.'
const DISCONNECTED_MESSAGE = 'InterceptPilot extension disconnected.'
const COMMAND_NOT_ALLOWED_MESSAGE = 'Command is not allowed.'
const TOO_MANY_PENDING_MESSAGE = 'Too many pending InterceptPilot requests.'

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

export function createExtensionBridge(options = {}) {
  const {
    WebSocketServerCtor = WebSocketServer,
    port = BRIDGE_PORT,
    expectedKey = '',
    expectedToken = '',
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    maxPendingRequests = DEFAULT_MAX_PENDING_REQUESTS,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    idGenerator,
    logger = createDefaultLogger(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval
  } = options

  // `expectedKey` is preferred; `expectedToken` stays as a temporary alias.
  const expectedConnectionKey = String(expectedKey || expectedToken || '')

  let server = null
  let activeSocket = null
  let connected = false
  let requestSeq = 0
  let heartbeatTimer = null
  const pending = new Map()
  const host = BRIDGE_HOST

  function nextRequestId() {
    if (idGenerator) return idGenerator()
    requestSeq += 1
    return `req_${requestSeq}`
  }

  function isConnected() {
    return Boolean(activeSocket && connected)
  }

  function rejectPending(message) {
    for (const [, request] of pending) {
      clearTimeoutFn(request.timer)
      request.reject(createSafeError(message))
    }
    pending.clear()
  }

  function startHeartbeat() {
    if (heartbeatTimer) return
    heartbeatTimer = setIntervalFn(() => {
      if (activeSocket && connected) sendJson(activeSocket, createPingMessage())
    }, heartbeatIntervalMs)
    heartbeatTimer?.unref?.()
  }

  function stopHeartbeat() {
    if (!heartbeatTimer) return
    clearIntervalFn(heartbeatTimer)
    heartbeatTimer = null
  }

  function detachSocket(socket) {
    if (socket !== activeSocket) return
    activeSocket = null
    connected = false
    stopHeartbeat()
    rejectPending(DISCONNECTED_MESSAGE)
    logger.info('Extension disconnected.')
  }

  function handleResponse(message) {
    if (!isCommandResponse(message)) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    clearTimeoutFn(request.timer)

    if (message.type === 'command:error' || message.ok === false) {
      request.reject(createSafeError(String(message.error?.message || 'InterceptPilot command failed.')))
      return
    }

    request.resolve(message.result)
  }

  function acceptHello(socket, message) {
    const validation = validateHelloMessage(message, { expectedKey: expectedConnectionKey })
    if (!validation.ok) {
      logger.warn(validation.error)
      socket.close()
      return
    }

    if (activeSocket && activeSocket !== socket) {
      const previousSocket = activeSocket
      rejectPending(DISCONNECTED_MESSAGE)
      previousSocket.close()
    }

    activeSocket = socket
    connected = true
    sendJson(socket, createHelloAckMessage())
    startHeartbeat()
    logger.info('Extension connected.')
  }

  function handleSocketMessage(socket, raw) {
    const message = parseBridgeMessage(raw)
    if (!message) {
      logger.warn('Ignoring invalid message from extension.')
      return
    }

    if (!connected || socket !== activeSocket) {
      if (message.type === 'hello') acceptHello(socket, message)
      return
    }

    if (message.type === MESSAGE_TYPES.pong) return

    handleResponse(message)
  }

  function handleSocket(socket) {
    addSocketListener(socket, 'message', raw => handleSocketMessage(socket, raw))
    addSocketListener(socket, 'close', () => detachSocket(socket))
    addSocketListener(socket, 'error', () => detachSocket(socket))
  }

  function start() {
    if (server) return server
    server = new WebSocketServerCtor({ host, port })
    server.on('connection', handleSocket)
    server.on('listening', () => logger.info(`WebSocket bridge listening on ${host}:${port}.`))
    server.on('error', () => logger.error('WebSocket bridge error.'))
    return server
  }

  async function close() {
    stopHeartbeat()
    rejectPending(DISCONNECTED_MESSAGE)
    if (activeSocket) activeSocket.close()
    activeSocket = null
    connected = false
    if (server && typeof server.close === 'function') {
      await new Promise(resolve => server.close(resolve))
    }
    server = null
  }

  function callCommand(command, payload = {}) {
    if (!isAllowedCommand(command)) {
      return Promise.reject(createSafeError(COMMAND_NOT_ALLOWED_MESSAGE))
    }
    if (!isConnected()) {
      return Promise.reject(createSafeError(NOT_CONNECTED_MESSAGE))
    }
    if (pending.size >= maxPendingRequests) {
      return Promise.reject(createSafeError(TOO_MANY_PENDING_MESSAGE))
    }

    const id = nextRequestId()
    const message = createCommandMessage(id, command, payload && typeof payload === 'object' ? payload : {})

    return new Promise((resolve, reject) => {
      const timer = setTimeoutFn(() => {
        pending.delete(id)
        reject(createSafeError(TIMEOUT_MESSAGE))
      }, requestTimeoutMs)
      pending.set(id, { resolve, reject, timer })
      sendJson(activeSocket, message)
    })
  }

  return {
    start,
    close,
    handleSocket,
    callCommand,
    isConnected,
    getPendingCount: () => pending.size
  }
}
