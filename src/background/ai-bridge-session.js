import {
  AI_BRIDGE_STATUS,
  DEFAULT_AI_BRIDGE_PORT,
  createAiBridgeSessionState,
  normalizeAiBridgeSessionState
} from '../shared/ai-bridge-state.js'
import { createSessionAiBridgePermissions, normalizeAiBridgePermissionsPatch } from '../shared/ai-bridge-permissions.js'

export function createAiBridgeSessionController(options = {}) {
  const {
    now = () => new Date().toISOString(),
    port = DEFAULT_AI_BRIDGE_PORT
  } = options
  let currentSession = createAiBridgeSessionState({ port })

  function isActive() {
    return currentSession.status !== AI_BRIDGE_STATUS.disabled
  }

  return {
    getSession() {
      return normalizeAiBridgeSessionState(currentSession)
    },
    startSession(defaultPermissions = {}) {
      currentSession = normalizeAiBridgeSessionState({
        status: AI_BRIDGE_STATUS.waiting,
        port,
        startedAt: now(),
        connectedAt: null,
        permissions: createSessionAiBridgePermissions(defaultPermissions)
      })
      return this.getSession()
    },
    markConnected() {
      if (!isActive()) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        ...currentSession,
        status: AI_BRIDGE_STATUS.connected,
        connectedAt: now()
      })
      return this.getSession()
    },
    markWaiting() {
      if (!isActive()) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        ...currentSession,
        status: AI_BRIDGE_STATUS.waiting,
        connectedAt: null
      })
      return this.getSession()
    },
    stopSession() {
      currentSession = createAiBridgeSessionState({ port })
      return this.getSession()
    },
    updateSessionPermissions(patch = {}) {
      if (!isActive()) return this.getSession()
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

export function stopAiBridgeSession() {
  return aiBridgeSessionController.stopSession()
}

export function updateAiBridgeSessionPermissions(patch) {
  return aiBridgeSessionController.updateSessionPermissions(patch)
}
