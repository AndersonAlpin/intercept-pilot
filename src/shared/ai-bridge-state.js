import { createSessionAiBridgePermissions, normalizeAiBridgeSessionPermissions } from './ai-bridge-permissions.js'

export const AI_BRIDGE_STATUS = {
  disabled: 'disabled',
  waiting: 'waiting',
  connected: 'connected'
}

export const DEFAULT_AI_BRIDGE_PORT = 37177

export const LOCAL_MCP_ENTRY_PLACEHOLDER = '<caminho-local>/interceptpilot-mcp/src/index.js'

export function generateAiBridgeConnectionKey(byteLength = 32) {
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

export function resolveAiBridgeConnectionKey(existingKey = '') {
  const key = String(existingKey || '')
  return key || generateAiBridgeConnectionKey()
}

export function redactAiBridgeKey(text = '', key = '') {
  const value = String(text ?? '')
  const connectionKey = String(key || '')
  if (!connectionKey) return value
  return value.split(connectionKey).join('[redacted]')
}

export function createAiBridgeSessionState(seed = {}) {
  return {
    status: AI_BRIDGE_STATUS.disabled,
    port: Number(seed.port || DEFAULT_AI_BRIDGE_PORT),
    startedAt: null,
    connectedAt: null,
    permissions: null
  }
}

export function normalizeAiBridgeSessionState(session = {}) {
  const status = String(session.status || AI_BRIDGE_STATUS.disabled)
  if (!Object.values(AI_BRIDGE_STATUS).includes(status)) return createAiBridgeSessionState(session)

  return {
    status,
    port: Number(session.port || DEFAULT_AI_BRIDGE_PORT),
    startedAt: session.startedAt || null,
    connectedAt: status === AI_BRIDGE_STATUS.connected ? (session.connectedAt || null) : null,
    permissions: status === AI_BRIDGE_STATUS.disabled
      ? null
      : normalizeAiBridgeSessionPermissions(session.permissions || createSessionAiBridgePermissions())
  }
}

export function buildAiBridgeMcpConfig({ key = '', port = DEFAULT_AI_BRIDGE_PORT, mode = 'npx' } = {}) {
  const connectionKey = String(key || '')
  if (!connectionKey) return null
  const portText = String(Number(port) || DEFAULT_AI_BRIDGE_PORT)
  const server = mode === 'local'
    ? { command: 'node', args: [LOCAL_MCP_ENTRY_PLACEHOLDER, '--port', portText, '--key', connectionKey] }
    : { command: 'npx', args: ['-y', 'interceptpilot-mcp', '--port', portText, '--key', connectionKey] }
  return { mcpServers: { interceptpilot: server } }
}

export function buildAiBridgeMcpConfigText(options = {}) {
  const config = buildAiBridgeMcpConfig(options)
  return config ? JSON.stringify(config, null, 2) : ''
}
