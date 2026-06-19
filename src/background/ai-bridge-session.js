import {
  AI_BRIDGE_STATUS,
  DEFAULT_AI_BRIDGE_PORT,
  createAiBridgeSessionState,
  normalizeAiBridgeSessionState
} from '../shared/ai-bridge-state.js'

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
    startSession() {
      currentSession = normalizeAiBridgeSessionState({
        status: AI_BRIDGE_STATUS.waiting,
        token: tokenGenerator(),
        port,
        startedAt: now(),
        connectedAt: null
      })
      return this.getSession()
    },
    revokeSession() {
      currentSession = createAiBridgeSessionState({ port })
      return this.getSession()
    }
  }
}

const aiBridgeSessionController = createAiBridgeSessionController()

export function getAiBridgeSession() {
  return aiBridgeSessionController.getSession()
}

export function startAiBridgeSession() {
  return aiBridgeSessionController.startSession()
}

export function revokeAiBridgeSession() {
  return aiBridgeSessionController.revokeSession()
}
