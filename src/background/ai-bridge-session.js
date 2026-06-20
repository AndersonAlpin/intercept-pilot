import {
  AI_BRIDGE_STATUS,
  DEFAULT_AI_BRIDGE_PORT,
  createAiBridgeSessionState,
  normalizeAiBridgeSessionState
} from '../shared/ai-bridge-state.js'
import { createSessionAiBridgePermissions, normalizeAiBridgePermissionsPatch } from '../shared/ai-bridge-permissions.js'

function randomHexToken(byteLength = 32) {
  const bytes = new Uint8Array(byteLength)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createAiBridgeSessionController(options = {}) {
  const {
    tokenGenerator = randomHexToken,
    now = () => new Date().toISOString(),
    port = DEFAULT_AI_BRIDGE_PORT
  } = options
  let currentSession = createAiBridgeSessionState({ port })

  return {
    getSession() {
      return normalizeAiBridgeSessionState(currentSession)
    },
    startSession(defaultPermissions = {}) {
      currentSession = normalizeAiBridgeSessionState({
        status: AI_BRIDGE_STATUS.waiting,
        token: tokenGenerator(),
        port,
        startedAt: now(),
        connectedAt: null,
        permissions: createSessionAiBridgePermissions(defaultPermissions)
      })
      return this.getSession()
    },
    markConnected() {
      if (!currentSession.token) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        ...currentSession,
        status: AI_BRIDGE_STATUS.connected,
        connectedAt: now()
      })
      return this.getSession()
    },
    markWaiting() {
      if (!currentSession.token) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        ...currentSession,
        status: AI_BRIDGE_STATUS.waiting,
        connectedAt: null
      })
      return this.getSession()
    },
    revokeSession() {
      currentSession = createAiBridgeSessionState({ port })
      return this.getSession()
    },
    updateSessionPermissions(patch = {}) {
      if (!currentSession.token) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        ...currentSession,
        permissions: {
          ...(currentSession.permissions || createSessionAiBridgePermissions()),
          ...normalizeAiBridgePermissionsPatch(patch)
        }
      })
      return this.getSession()
    }
  }
}

const aiBridgeSessionController = createAiBridgeSessionController()

export function getAiBridgeSession() {
  return aiBridgeSessionController.getSession()
}

export function startAiBridgeSession(defaultPermissions) {
  return aiBridgeSessionController.startSession(defaultPermissions)
}

export function markAiBridgeConnected() {
  return aiBridgeSessionController.markConnected()
}

export function markAiBridgeWaiting() {
  return aiBridgeSessionController.markWaiting()
}

export function revokeAiBridgeSession() {
  return aiBridgeSessionController.revokeSession()
}

export function updateAiBridgeSessionPermissions(patch) {
  return aiBridgeSessionController.updateSessionPermissions(patch)
}
