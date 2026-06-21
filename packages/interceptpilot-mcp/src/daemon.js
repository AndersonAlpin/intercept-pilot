import { WebSocketServer } from 'ws'

import {
  BRIDGE_HOST,
  BRIDGE_PORT,
  MESSAGE_TYPES,
  createClientHelloAckMessage,
  createCommandMessage,
  createHelloAckMessage,
  createPingMessage,
  isAllowedCommand,
  isCommandResponse,
  parseBridgeMessage,
  validateClientHelloMessage,
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
  if (!socket || socket.closed) return
  socket.send(JSON.stringify(message))
}

function createClientError(id, code, message) {
  return {
    id,
    type: MESSAGE_TYPES.clientError,
    ok: false,
    error: { code, message }
  }
}

export function createInterceptPilotDaemon(options = {}) {
  const {
    WebSocketServerCtor = WebSocketServer,
    port = BRIDGE_PORT,
    expectedKey = '',
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_INTERVAL_MS,
    maxPendingRequests = DEFAULT_MAX_PENDING_REQUESTS,
    idGenerator,
    logger = createDefaultLogger(),
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    setIntervalFn = setInterval,
    clearIntervalFn = clearInterval
  } = options

  const expectedConnectionKey = String(expectedKey || '')
  const clients = new Set()
  const pending = new Map()
  const host = BRIDGE_HOST
  let server = null
  let extensionSocket = null
  let extensionConnected = false
  let requestSeq = 0
  let heartbeatTimer = null

  function nextRequestId() {
    if (idGenerator) return idGenerator()
    requestSeq += 1
    return `daemon_req_${requestSeq}`
  }

  function isExtensionConnected() {
    return Boolean(extensionSocket && extensionConnected)
  }

  function startHeartbeat() {
    if (heartbeatTimer) return
    heartbeatTimer = setIntervalFn(() => {
      if (isExtensionConnected()) sendJson(extensionSocket, createPingMessage())
    }, heartbeatIntervalMs)
    heartbeatTimer?.unref?.()
  }

  function stopHeartbeat() {
    if (!heartbeatTimer) return
    clearIntervalFn(heartbeatTimer)
    heartbeatTimer = null
  }

  function rejectPendingForClient(clientSocket) {
    for (const [extensionRequestId, request] of pending) {
      if (request.clientSocket !== clientSocket) continue
      clearTimeoutFn(request.timer)
      pending.delete(extensionRequestId)
    }
  }

  function rejectAllPending(message) {
    for (const [extensionRequestId, request] of pending) {
      clearTimeoutFn(request.timer)
      pending.delete(extensionRequestId)
      sendJson(request.clientSocket, createClientError(
        request.clientRequestId,
        'EXTENSION_DISCONNECTED',
        message
      ))
    }
  }

  function detachExtension(socket) {
    if (socket !== extensionSocket) return
    extensionSocket = null
    extensionConnected = false
    stopHeartbeat()
    rejectAllPending(DISCONNECTED_MESSAGE)
    logger.info('Extension disconnected.')
  }

  function detachClient(socket) {
    if (!clients.has(socket)) return
    clients.delete(socket)
    rejectPendingForClient(socket)
    logger.info('MCP client disconnected.')
  }

  function acceptExtension(socket, message) {
    const validation = validateHelloMessage(message, { expectedKey: expectedConnectionKey })
    if (!validation.ok) {
      logger.warn(validation.error)
      socket.close()
      return
    }

    if (extensionSocket && extensionSocket !== socket) {
      const previousSocket = extensionSocket
      detachExtension(previousSocket)
      previousSocket.close()
    }

    extensionSocket = socket
    extensionConnected = true
    sendJson(socket, createHelloAckMessage())
    startHeartbeat()
    logger.info('Extension connected.')
  }

  function acceptClient(socket, message) {
    const validation = validateClientHelloMessage(message, { expectedKey: expectedConnectionKey })
    if (!validation.ok) {
      logger.warn(validation.error)
      socket.close()
      return
    }

    clients.add(socket)
    sendJson(socket, createClientHelloAckMessage())
    logger.info('MCP client connected.')
  }

  function sendClientError(socket, id, code, message) {
    sendJson(socket, createClientError(id, code, message))
  }

  function handleExtensionResponse(message) {
    if (!isCommandResponse(message)) return
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    clearTimeoutFn(request.timer)

    if (message.type === MESSAGE_TYPES.commandError || message.ok === false) {
      sendClientError(
        request.clientSocket,
        request.clientRequestId,
        String(message.error?.code || 'COMMAND_FAILED'),
        String(message.error?.message || 'InterceptPilot command failed.')
      )
      return
    }

    sendJson(request.clientSocket, {
      id: request.clientRequestId,
      type: MESSAGE_TYPES.clientResult,
      ok: true,
      result: message.result
    })
  }

  function handleClientCommand(socket, message) {
    const clientRequestId = String(message?.id || '')
    const command = String(message?.command || '')
    if (!clientRequestId) return

    if (!isAllowedCommand(command)) {
      sendClientError(socket, clientRequestId, 'COMMAND_NOT_ALLOWED', COMMAND_NOT_ALLOWED_MESSAGE)
      return
    }

    if (!isExtensionConnected()) {
      sendClientError(socket, clientRequestId, 'EXTENSION_NOT_CONNECTED', NOT_CONNECTED_MESSAGE)
      return
    }

    if (pending.size >= maxPendingRequests) {
      sendClientError(socket, clientRequestId, 'TOO_MANY_PENDING_REQUESTS', TOO_MANY_PENDING_MESSAGE)
      return
    }

    const extensionRequestId = nextRequestId()
    const timer = setTimeoutFn(() => {
      pending.delete(extensionRequestId)
      sendClientError(socket, clientRequestId, 'COMMAND_TIMEOUT', TIMEOUT_MESSAGE)
    }, requestTimeoutMs)
    timer?.unref?.()
    pending.set(extensionRequestId, { clientSocket: socket, clientRequestId, timer, command })
    sendJson(extensionSocket, createCommandMessage(
      extensionRequestId,
      command,
      message.payload && typeof message.payload === 'object' ? message.payload : {}
    ))
  }

  function handleSocketMessage(socket, raw) {
    const message = parseBridgeMessage(raw)
    if (!message) {
      logger.warn('Ignoring invalid bridge message.')
      return
    }

    if (message.type === MESSAGE_TYPES.hello) {
      acceptExtension(socket, message)
      return
    }

    if (message.type === MESSAGE_TYPES.clientHello) {
      acceptClient(socket, message)
      return
    }

    if (socket === extensionSocket && extensionConnected) {
      if (message.type === MESSAGE_TYPES.pong) return
      handleExtensionResponse(message)
      return
    }

    if (clients.has(socket)) {
      if (message.type === MESSAGE_TYPES.clientCommand) handleClientCommand(socket, message)
      return
    }
  }

  function handleSocket(socket) {
    addSocketListener(socket, 'message', raw => handleSocketMessage(socket, raw))
    addSocketListener(socket, 'close', () => {
      detachExtension(socket)
      detachClient(socket)
    })
    addSocketListener(socket, 'error', () => {
      detachExtension(socket)
      detachClient(socket)
    })
  }

  function start() {
    if (server) return server
    server = new WebSocketServerCtor({ host, port })
    server.on('connection', handleSocket)
    server.on('listening', () => logger.info(`Shared daemon listening on ${host}:${port}.`))
    server.on('error', () => logger.error('Shared daemon WebSocket error.'))
    return server
  }

  async function close() {
    stopHeartbeat()
    rejectAllPending(DISCONNECTED_MESSAGE)
    if (extensionSocket) extensionSocket.close()
    for (const client of Array.from(clients)) client.close()
    extensionSocket = null
    extensionConnected = false
    clients.clear()
    if (server && typeof server.close === 'function') {
      await new Promise(resolve => server.close(resolve))
    }
    server = null
  }

  return {
    start,
    close,
    handleSocket,
    isExtensionConnected,
    getClientCount: () => clients.size,
    getPendingCount: () => pending.size
  }
}
