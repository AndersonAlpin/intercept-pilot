export const AI_BRIDGE_STATUS = {
  disabled: 'disabled',
  waiting: 'waiting',
  connected: 'connected'
}

export const DEFAULT_AI_BRIDGE_PORT = 37177

export function createAiBridgeSessionState(seed = {}) {
  return {
    status: AI_BRIDGE_STATUS.disabled,
    token: '',
    port: Number(seed.port || DEFAULT_AI_BRIDGE_PORT),
    startedAt: null,
    connectedAt: null
  }
}

export function normalizeAiBridgeSessionState(session = {}) {
  const status = String(session.status || AI_BRIDGE_STATUS.disabled)
  const token = String(session.token || '')
  if (!Object.values(AI_BRIDGE_STATUS).includes(status)) return createAiBridgeSessionState()
  if (status !== AI_BRIDGE_STATUS.disabled && !token) return createAiBridgeSessionState()

  return {
    status,
    token: status === AI_BRIDGE_STATUS.disabled ? '' : token,
    port: Number(session.port || DEFAULT_AI_BRIDGE_PORT),
    startedAt: session.startedAt || null,
    connectedAt: session.connectedAt || null
  }
}

export function buildAiBridgeMcpConfig(session = {}) {
  const state = normalizeAiBridgeSessionState(session)
  if (!state.token) return null
  return {
    mcpServers: {
      interceptpilot: {
        command: 'npx',
        args: ['-y', 'interceptpilot-mcp', '--port', String(state.port), '--token', state.token]
      }
    }
  }
}

export function buildAiBridgeMcpConfigText(session = {}) {
  const config = buildAiBridgeMcpConfig(session)
  return config ? JSON.stringify(config, null, 2) : ''
}
