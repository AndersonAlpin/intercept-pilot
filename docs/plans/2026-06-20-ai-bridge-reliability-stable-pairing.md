# AI Bridge Reliability and Stable Pairing Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Tests run with `node --test`.

**Goal:** Make the AI Bridge connection reliable under MV3 and replace the per-session token with a stable connection key, so the MCP configuration is copied once and stays valid across restarts, while sessions and permissions remain temporary and the key stays secret.

**Architecture:** The extension background service worker (SW) is a WebSocket *client* ([src/background/ai-bridge-connection.js](../../src/background/ai-bridge-connection.js)) that connects to a local bridge *server* run by the MCP client ([packages/interceptpilot-mcp/src/websocket-bridge.js](../../packages/interceptpilot-mcp/src/websocket-bridge.js)). Today the credential is a fresh random token minted per "Start session", held only in memory ([src/background/ai-bridge-session.js](../../src/background/ai-bridge-session.js)), and the copied MCP config embeds that ephemeral token. This plan introduces a **stable connection key** persisted in settings, used both as the hello credential and in the copied config; the session (waiting/connected) and permissions stay transient. It also adds a **keepalive heartbeat + alarm backstop** so the SW survives idle and auto-reconnects, and a **persisted "enabled" flag** so a started bridge re-establishes after the SW is killed.

**Tech Stack:** Vanilla JS Manifest V3 extension (no bundler/framework), custom i18n, `ws`-based Node MCP server in `packages/interceptpilot-mcp`, `node --test` for tests.

## Global Constraints

- **Scope is explicitly authorized** to change AI Bridge runtime/connection behavior (overrides AGENTS.md "do not change runtime/capture behavior without explicit scope" for the AI Bridge connection only). Do **not** touch capture/rules/hit-state runtime.
- The connection key and any session token must **never** appear in logs, error messages, toasts/snackbars, broadcasts beyond what the config UI needs, or MCP tool return values.
- Permissions remain a separate concern from the key: default permissions in `settings.aiBridgePermissions`, session permissions on the transient session. The key does not gate or carry permissions.
- The session stays temporary; only the key (and an "enabled" preference) is persisted.
- `node --check` on every changed `.js`; `node --test` green; `git diff --check` clean.
- Coding style: 2 spaces, single quotes, no new semicolons; preserve ids, `data-*`, handlers, `escapeHtml`, ARIA, i18n. Visible text via `t()` only.
- Locale files `pt-BR.js`, `en.js`, `es.js` keep identical key sets.
- **Do not publish the npm package in this plan.** Handle the unpublished package via a clearly-labeled local/dev config (Task 9).
- Do not commit without an explicit request from the user (commits in steps are the intended boundaries; run them only when the user has asked to commit).

---

## Naming (authoritative)

- The stable credential is a **connection key**, never a "token", in the new model. Use `connectionKey` (internal), `aiBridgeConnectionKey` (settings), `--key` (CLI / copied config), and a `key` field on the WebSocket `hello`.
- Do **not** introduce new `token` names for the stable key. The per-session token is removed as the primary mechanism: the transient session no longer carries any credential field.
- **No alias:** the project is pre-prod, so there is no `--token` / `token` hello / `expectedToken` backward-compat alias. The credential is `--key` (CLI / copied config), `key` (hello field), `expectedKey` (bridge option) only.

## Definitions (target behavior)

- **Connection key (stable):** long random hex string, persisted in `settings.aiBridgeConnectionKey`. Embedded in the copied MCP config (`--key`) and sent by the extension on the WebSocket `hello` (`key` field). Survives Stop and SW restarts. Changes only on **Regenerate key**.
- **Enabled flag:** `settings.aiBridgeConnectionEnabled` (boolean). `Iniciar` sets it true; `Encerrar` sets it false. On SW startup, if true and a key exists, the bridge auto-connects.
- **Session (transient):** `{ status, connectedAt, permissions }` derived at runtime. `status` ∈ `disabled | waiting | connected`. No credential is stored on the session; the connection layer reads the key from settings via `getConnectionKey()`.
- **Iniciar (Start):** enable the connection and begin connecting with the current key.
- **Encerrar (Stop):** cut the current connection now; keep the key and the copied config valid; just stop connecting (enabled=false).
- **Regenerar chave (Regenerate key):** mint a new key, persist it, invalidate the old config (old MCP clients fail the handshake). Requires the user to copy the new config. Does not delete permissions.

---

## File Structure

- `src/shared/ai-bridge-state.js` — key generator, settings field defaults helpers, `buildAiBridgeMcpConfig`/`...Text` rewritten to take `{ key, port, mode }`; add `redactAiBridgeKey`.
- `src/shared/constants.js` — add `aiBridgeConnectionKey` / `aiBridgeConnectionEnabled` to `DEFAULT_SETTINGS`.
- `src/shared/messaging.js` — add `AI_BRIDGE_REGENERATE_KEY`; keep `AI_BRIDGE_START_SESSION` (enable) and `AI_BRIDGE_REVOKE_SESSION` (now = stop).
- `src/background/ai-bridge-session.js` — session controller keyed off a supplied stable key; `startSession({ key, defaultPermissions })`, `stopSession()`, no per-session token minting.
- `src/background/ai-bridge-connection.js` — `ping`/`pong` handling; alarm-driven reconnect hook; cleanup.
- `src/background/ai-bridge-keepalive.js` *(new)* — `chrome.alarms` backstop that calls `sync()` while enabled.
- `src/background/background.js` — persist key/enabled via `updateSettings`; rewire start/stop handlers; add regenerate handler; auto-connect on init; wire keepalive.
- `packages/interceptpilot-mcp/src/protocol.js` — add `ping`/`pong` message constants + builders.
- `packages/interceptpilot-mcp/src/websocket-bridge.js` — server-side heartbeat ping loop; ignore pong; clear on close.
- `src/fullapp/components/ai-bridge-page.js` — Start/Stop/Regenerate buttons; show config whenever a key exists.
- `src/fullapp/fullapp.js` — handlers for start/stop/regenerate; build config from `settings.aiBridgeConnectionKey`.
- `src/shared/locales/{pt-BR,en,es}.js` — keys for regenerate button + dev-config note + regenerate confirmation.
- Tests under `tests/` and `packages/interceptpilot-mcp/tests/`.

---

## Phase 1 — Stable connection key (core)

### Task 1: Add persisted key/enabled settings and a key generator

**Files:**
- Modify: `src/shared/constants.js:28-43`
- Modify: `src/shared/ai-bridge-state.js`
- Test: `tests/ai-bridge-state.test.js`

**Interfaces:**
- Produces: `DEFAULT_SETTINGS.aiBridgeConnectionKey: ''`, `DEFAULT_SETTINGS.aiBridgeConnectionEnabled: false`; `generateAiBridgeConnectionKey(): string` (64 hex chars); `redactAiBridgeKey(text: string, key: string): string`.

- [ ] **Step 1: Write the failing test**

Add to `tests/ai-bridge-state.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { generateAiBridgeConnectionKey, redactAiBridgeKey } from '../src/shared/ai-bridge-state.js'

test('generateAiBridgeConnectionKey returns 64 hex chars and is unique', () => {
  const a = generateAiBridgeConnectionKey()
  const b = generateAiBridgeConnectionKey()
  assert.match(a, /^[0-9a-f]{64}$/)
  assert.notEqual(a, b)
})

test('redactAiBridgeKey masks the key everywhere it appears', () => {
  const key = 'a'.repeat(64)
  const text = `token=${key} again ${key}`
  const out = redactAiBridgeKey(text, key)
  assert.equal(out.includes(key), false)
  assert.match(out, /token=\[redacted\] again \[redacted\]/)
})

test('redactAiBridgeKey is a no-op for empty key', () => {
  assert.equal(redactAiBridgeKey('hello', ''), 'hello')
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test tests/ai-bridge-state.test.js`
Expected: FAIL (functions not exported).

- [ ] **Step 3: Implement**

In `src/shared/ai-bridge-state.js`, add (reusing the existing crypto pattern from `ai-bridge-session.js`):

```js
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

export function redactAiBridgeKey(text = '', key = '') {
  const value = String(text ?? '')
  if (!key) return value
  return value.split(key).join('[redacted]')
}
```

In `src/shared/constants.js`, extend `DEFAULT_SETTINGS`:

```js
  aiBridgePermissions: { ...AI_BRIDGE_DEFAULT_PERMISSIONS },
  aiBridgeConnectionKey: '',
  aiBridgeConnectionEnabled: false
```

- [ ] **Step 4: Run tests**

Run: `node --test tests/ai-bridge-state.test.js`
Expected: PASS. Also `node --check src/shared/ai-bridge-state.js src/shared/constants.js`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ai-bridge-state.js src/shared/constants.js tests/ai-bridge-state.test.js
git commit -m "feat(ai-bridge): add stable connection key generator and settings fields"
```

---

### Task 2: Build the MCP config from the stable key (npx + local/dev modes)

Replace the session-token config with a key-based config. Support a `mode` so the unpublished package can be used via a clearly-labeled local command without publishing.

**Files:**
- Modify: `src/shared/ai-bridge-state.js:40-56`
- Test: `tests/ai-bridge-state.test.js`

**Interfaces:**
- Produces:
  - `LOCAL_MCP_ENTRY_PLACEHOLDER = '<caminho-local>/packages/interceptpilot-mcp/src/index.js'`
  - `buildAiBridgeMcpConfig({ key, port, mode })` → object or `null` when no key. `mode` ∈ `'npx'` (default) | `'local'`.
  - `buildAiBridgeMcpConfigText({ key, port, mode })` → string (`''` when no key).
- Consumes: `generateAiBridgeConnectionKey` not used here.

- [ ] **Step 1: Write the failing test**

Add to `tests/ai-bridge-state.test.js`:

```js
import {
  buildAiBridgeMcpConfig,
  buildAiBridgeMcpConfigText,
  LOCAL_MCP_ENTRY_PLACEHOLDER
} from '../src/shared/ai-bridge-state.js'

test('config is null without a key', () => {
  assert.equal(buildAiBridgeMcpConfig({ key: '', port: 37177 }), null)
  assert.equal(buildAiBridgeMcpConfigText({ key: '', port: 37177 }), '')
})

test('npx config embeds the stable key and port', () => {
  const cfg = buildAiBridgeMcpConfig({ key: 'k'.repeat(64), port: 37177 })
  assert.equal(cfg.mcpServers.interceptpilot.command, 'npx')
  assert.deepEqual(cfg.mcpServers.interceptpilot.args, ['-y', 'interceptpilot-mcp', '--port', '37177', '--token', 'k'.repeat(64)])
})

test('local/dev config uses node with the placeholder entry path', () => {
  const cfg = buildAiBridgeMcpConfig({ key: 'k'.repeat(64), port: 37177, mode: 'local' })
  assert.equal(cfg.mcpServers.interceptpilot.command, 'node')
  assert.equal(cfg.mcpServers.interceptpilot.args[0], LOCAL_MCP_ENTRY_PLACEHOLDER)
  assert.ok(cfg.mcpServers.interceptpilot.args.includes('k'.repeat(64)))
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test tests/ai-bridge-state.test.js`
Expected: FAIL (signature mismatch / missing export).

- [ ] **Step 3: Implement**

In `src/shared/ai-bridge-state.js`, replace `buildAiBridgeMcpConfig` and `buildAiBridgeMcpConfigText`:

```js
export const LOCAL_MCP_ENTRY_PLACEHOLDER = '<caminho-local>/packages/interceptpilot-mcp/src/index.js'

export function buildAiBridgeMcpConfig({ key = '', port = DEFAULT_AI_BRIDGE_PORT, mode = 'npx' } = {}) {
  const connectionKey = String(key || '')
  if (!connectionKey) return null
  const portText = String(Number(port) || DEFAULT_AI_BRIDGE_PORT)
  const server = mode === 'local'
    ? { command: 'node', args: [LOCAL_MCP_ENTRY_PLACEHOLDER, '--port', portText, '--token', connectionKey] }
    : { command: 'npx', args: ['-y', 'interceptpilot-mcp', '--port', portText, '--token', connectionKey] }
  return { mcpServers: { interceptpilot: server } }
}

export function buildAiBridgeMcpConfigText(options = {}) {
  const config = buildAiBridgeMcpConfig(options)
  return config ? JSON.stringify(config, null, 2) : ''
}
```

- [ ] **Step 4: Run tests + check**

Run: `node --test tests/ai-bridge-state.test.js` (PASS) and `node --check src/shared/ai-bridge-state.js`.
Note: call sites in `fullapp.js` and `ai-bridge-page.js` still pass a session object; they are migrated in Task 7. Until then, run only the targeted test file, not the full UI.

- [ ] **Step 5: Commit**

```bash
git add src/shared/ai-bridge-state.js tests/ai-bridge-state.test.js
git commit -m "feat(ai-bridge): build MCP config from stable key with local/dev mode"
```

---

### Task 3: Session controller keyed off a stable key (start/stop, no token minting)

**Files:**
- Modify: `src/background/ai-bridge-session.js`
- Test: `tests/ai-bridge-session.test.js` *(create)*

**Interfaces:**
- Produces (controller): `startSession({ key, defaultPermissions })` → session with `status: 'waiting'`, `token: key`, session permissions from defaults; `stopSession()` → `status: 'disabled'`, no token; `markConnected()`/`markWaiting()` unchanged; `updateSessionPermissions(patch)` unchanged.
- Removed: per-session token minting (`tokenGenerator`). The key now comes from the caller (settings).
- Module exports: `startAiBridgeSession({ key, defaultPermissions })`, `stopAiBridgeSession()` (replaces `revokeAiBridgeSession`), `markAiBridgeConnected`, `markAiBridgeWaiting`, `updateAiBridgeSessionPermissions`, `getAiBridgeSession`.

- [ ] **Step 1: Write the failing test**

Create `tests/ai-bridge-session.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiBridgeSessionController } from '../src/background/ai-bridge-session.js'

test('startSession uses the provided key as token and waits', () => {
  const c = createAiBridgeSessionController({ now: () => 'T0' })
  const s = c.startSession({ key: 'k'.repeat(64), defaultPermissions: {} })
  assert.equal(s.status, 'waiting')
  assert.equal(s.token, 'k'.repeat(64))
})

test('stopSession clears the in-memory session but is key-agnostic', () => {
  const c = createAiBridgeSessionController()
  c.startSession({ key: 'k'.repeat(64), defaultPermissions: {} })
  const s = c.stopSession()
  assert.equal(s.status, 'disabled')
  assert.equal(s.token, '')
})

test('markConnected only applies when a key-backed session exists', () => {
  const c = createAiBridgeSessionController({ now: () => 'T1' })
  assert.equal(c.markConnected().status, 'disabled')
  c.startSession({ key: 'k'.repeat(64), defaultPermissions: {} })
  assert.equal(c.markConnected().status, 'connected')
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test tests/ai-bridge-session.test.js`
Expected: FAIL (`startSession` signature / `stopSession` missing).

- [ ] **Step 3: Implement**

In `src/background/ai-bridge-session.js`, drop `randomHexToken`/`tokenGenerator`, and rewrite the controller methods:

```js
export function createAiBridgeSessionController(options = {}) {
  const {
    now = () => new Date().toISOString(),
    port = DEFAULT_AI_BRIDGE_PORT
  } = options
  let currentSession = createAiBridgeSessionState({ port })

  return {
    getSession() {
      return normalizeAiBridgeSessionState(currentSession)
    },
    startSession({ key = '', defaultPermissions = {} } = {}) {
      if (!key) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({
        status: AI_BRIDGE_STATUS.waiting,
        token: key,
        port,
        startedAt: now(),
        connectedAt: null,
        permissions: createSessionAiBridgePermissions(defaultPermissions)
      })
      return this.getSession()
    },
    markConnected() {
      if (!currentSession.token) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({ ...currentSession, status: AI_BRIDGE_STATUS.connected, connectedAt: now() })
      return this.getSession()
    },
    markWaiting() {
      if (!currentSession.token) return this.getSession()
      currentSession = normalizeAiBridgeSessionState({ ...currentSession, status: AI_BRIDGE_STATUS.waiting, connectedAt: null })
      return this.getSession()
    },
    stopSession() {
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
export function startAiBridgeSession(args) {
  return aiBridgeSessionController.startSession(args)
}
export function stopAiBridgeSession() {
  return aiBridgeSessionController.stopSession()
}
export function markAiBridgeConnected() {
  return aiBridgeSessionController.markConnected()
}
export function markAiBridgeWaiting() {
  return aiBridgeSessionController.markWaiting()
}
export function updateAiBridgeSessionPermissions(patch) {
  return aiBridgeSessionController.updateSessionPermissions(patch)
}
```

- [ ] **Step 4: Run tests + check**

Run: `node --test tests/ai-bridge-session.test.js` (PASS); `node --check src/background/ai-bridge-session.js`.
Note: `background.js` imports `startAiBridgeSession`/`revokeAiBridgeSession`; it is updated in Task 4. Do not run the whole suite yet.

- [ ] **Step 5: Commit**

```bash
git add src/background/ai-bridge-session.js tests/ai-bridge-session.test.js
git commit -m "feat(ai-bridge): key-based session controller with start/stop"
```

---

### Task 4: Background — persist key/enabled, rewire start/stop, add regenerate, auto-connect on init

**Files:**
- Modify: `src/shared/messaging.js:30-39`
- Modify: `src/background/background.js` (imports ~15-20; handlers 1779-1798; init wiring near 849-856)

**Interfaces:**
- Produces message types: `AI_BRIDGE_REGENERATE_KEY: 'aiBridge:regenerateKey'`. `AI_BRIDGE_START_SESSION` now means "enable + connect"; `AI_BRIDGE_REVOKE_SESSION` now means "stop (disconnect, keep key)".
- Consumes: `generateAiBridgeConnectionKey` (Task 1), `startAiBridgeSession`/`stopAiBridgeSession` (Task 3), `updateSettings` (storage), `aiBridgeConnection.sync()/disconnect()`.

- [ ] **Step 1: Add the message type**

In `src/shared/messaging.js`, add after `AI_BRIDGE_REVOKE_SESSION`:

```js
  AI_BRIDGE_REGENERATE_KEY: 'aiBridge:regenerateKey',
```

- [ ] **Step 2: Update background imports**

In `src/background/background.js`, change the session imports to the new names and add the key generator:

```js
  getAiBridgeSession,
  markAiBridgeConnected,
  markAiBridgeWaiting,
  stopAiBridgeSession,
  startAiBridgeSession,
  updateAiBridgeSessionPermissions
```

and add near the other `ai-bridge-state` imports:

```js
import { generateAiBridgeConnectionKey } from '../shared/ai-bridge-state.js'
```

- [ ] **Step 3: Add a helper to ensure a key exists, then rewrite handlers**

Add a helper above the message switch (near the other AI bridge helpers):

```js
async function ensureAiBridgeConnectionKey() {
  const state = await getState()
  let key = String(state.settings?.aiBridgeConnectionKey || '')
  if (!key) {
    key = generateAiBridgeConnectionKey()
    await updateSettings({ aiBridgeConnectionKey: key })
  }
  return key
}
```

Replace the `aiBridge:startSession` and `aiBridge:revokeSession` cases, and add `aiBridge:regenerateKey`:

```js
      case 'aiBridge:startSession': {
        const state = await getState()
        cancelPendingAiImport()
        cancelPendingAiRuleAction()
        const key = await ensureAiBridgeConnectionKey()
        await updateSettings({ aiBridgeConnectionEnabled: true })
        const aiBridgeSession = startAiBridgeSession({ key, defaultPermissions: state.settings?.aiBridgePermissions })
        aiBridgeConnection.sync()
        startAiBridgeKeepalive()
        sendResponse({ aiBridgeSession })
        broadcastAiBridgeImport()
        broadcastAiBridgeAction()
        return
      }
      case 'aiBridge:revokeSession': {
        aiBridgeConnection.disconnect()
        stopAiBridgeKeepalive()
        await updateSettings({ aiBridgeConnectionEnabled: false })
        cancelPendingAiImport()
        cancelPendingAiRuleAction()
        sendResponse({ aiBridgeSession: stopAiBridgeSession() })
        broadcastAiBridgeImport()
        broadcastAiBridgeAction()
        return
      }
      case 'aiBridge:regenerateKey': {
        const state = await getState()
        const key = generateAiBridgeConnectionKey()
        await updateSettings({ aiBridgeConnectionKey: key })
        const enabled = state.settings?.aiBridgeConnectionEnabled !== false && getAiBridgeSession().status !== AI_BRIDGE_STATUS.disabled
        let aiBridgeSession = getAiBridgeSession()
        if (enabled) {
          aiBridgeConnection.disconnect()
          aiBridgeSession = startAiBridgeSession({ key, defaultPermissions: state.settings?.aiBridgePermissions })
          aiBridgeConnection.sync()
        }
        sendResponse({ aiBridgeSession })
        return
      }
```

> `AI_BRIDGE_STATUS` is already imported at the top of `ai-bridge-session.js`; in `background.js` import it from `../shared/ai-bridge-state.js` if not already present (check the existing import block and add `AI_BRIDGE_STATUS` if missing).

- [ ] **Step 4: Auto-connect on SW startup**

Find where the background initializes (after `aiBridgeConnection` is created, ~line 856, inside the existing init/`ensureState` path). Add an init call that runs on SW load:

```js
async function initAiBridgeFromSettings() {
  const state = await getState()
  const enabled = state.settings?.aiBridgeConnectionEnabled === true
  const key = String(state.settings?.aiBridgeConnectionKey || '')
  if (!enabled || !key) return
  startAiBridgeSession({ key, defaultPermissions: state.settings?.aiBridgePermissions })
  aiBridgeConnection.sync()
  startAiBridgeKeepalive()
  broadcastAiBridgeSession()
}
```

Call `initAiBridgeFromSettings()` from the existing top-level init sequence (where `ensureState()` is awaited at startup). `startAiBridgeKeepalive`/`stopAiBridgeKeepalive` are defined in Task 6; until then, add temporary no-op stubs so this task runs standalone:

```js
function startAiBridgeKeepalive() {}
function stopAiBridgeKeepalive() {}
```

(These stubs are replaced by the real import in Task 6.)

- [ ] **Step 5: Verify**

Run: `node --check src/background/background.js src/shared/messaging.js`.
Run the existing suite to catch broken imports: `node --test` (expect AI-bridge tests green; UI is migrated in Task 7 so any UI-driven test that builds config from a session may still fail — note which, fix in Task 7).

- [ ] **Step 6: Commit**

```bash
git add src/shared/messaging.js src/background/background.js
git commit -m "feat(ai-bridge): persist key/enabled, stable start/stop, regenerate, auto-connect"
```

---

## Phase 2 — Reliability (MV3)

### Task 5: Bridge server heartbeat (server → extension ping)

Keep the extension SW alive by sending periodic application-level pings over the active socket (Chrome 116+ treats inbound WS messages as activity that extends SW lifetime).

**Files:**
- Modify: `packages/interceptpilot-mcp/src/protocol.js`
- Modify: `packages/interceptpilot-mcp/src/websocket-bridge.js`
- Test: `packages/interceptpilot-mcp/tests/websocket-bridge.test.js` *(create or extend)*

**Interfaces:**
- Produces: `MESSAGE_TYPES.ping = 'ping'`, `MESSAGE_TYPES.pong = 'pong'`, `createPingMessage()`; bridge option `heartbeatIntervalMs` (default 20000) and injectable `setIntervalFn`/`clearIntervalFn`.

- [ ] **Step 1: Write the failing test**

Create `packages/interceptpilot-mcp/tests/websocket-bridge.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createExtensionBridge } from '../src/websocket-bridge.js'

function fakeSocket() {
  const sent = []
  const handlers = {}
  return {
    sent,
    on(event, fn) { handlers[event] = fn },
    send(data) { sent.push(JSON.parse(data)) },
    close() { handlers.close && handlers.close() },
    emit(event, data) { handlers[event] && handlers[event](data) }
  }
}

test('server pings the active socket on the heartbeat interval', () => {
  let tick = null
  const bridge = createExtensionBridge({
    WebSocketServerCtor: class { on() {} close(cb) { cb && cb() } },
    expectedToken: 'k',
    heartbeatIntervalMs: 1000,
    setIntervalFn: fn => { tick = fn; return 1 },
    clearIntervalFn: () => { tick = null },
    logger: { info() {}, warn() {}, error() {} }
  })
  const socket = fakeSocket()
  bridge.handleSocket(socket)
  socket.emit('message', JSON.stringify({ type: 'hello', source: 'interceptpilot-extension', version: 1, token: 'k' }))
  socket.sent.length = 0
  tick()
  assert.equal(socket.sent.some(m => m.type === 'ping'), true)
})

test('server ignores pong without error', () => {
  const bridge = createExtensionBridge({
    WebSocketServerCtor: class { on() {} close(cb) { cb && cb() } },
    expectedToken: 'k',
    logger: { info() {}, warn() {}, error() {} }
  })
  const socket = fakeSocket()
  bridge.handleSocket(socket)
  socket.emit('message', JSON.stringify({ type: 'hello', source: 'interceptpilot-extension', version: 1, token: 'k' }))
  assert.doesNotThrow(() => socket.emit('message', JSON.stringify({ type: 'pong' })))
  assert.equal(bridge.isConnected(), true)
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test packages/interceptpilot-mcp/tests/websocket-bridge.test.js`
Expected: FAIL (no ping behavior / options unsupported).

- [ ] **Step 3: Implement protocol constants**

In `packages/interceptpilot-mcp/src/protocol.js`, add to `MESSAGE_TYPES`:

```js
  ping: 'ping',
  pong: 'pong',
```

and add:

```js
export function createPingMessage() {
  return { type: MESSAGE_TYPES.ping }
}
```

- [ ] **Step 4: Implement server heartbeat**

In `packages/interceptpilot-mcp/src/websocket-bridge.js`:
- Import `createPingMessage` and `MESSAGE_TYPES`.
- Add options `heartbeatIntervalMs = 20000`, `setIntervalFn = setInterval`, `clearIntervalFn = clearInterval`.
- Add `let heartbeatTimer = null`.
- In `acceptHello`, after `connected = true`, start the heartbeat:

```js
    if (!heartbeatTimer) {
      heartbeatTimer = setIntervalFn(() => {
        if (activeSocket && connected) sendJson(activeSocket, createPingMessage())
      }, heartbeatIntervalMs)
    }
```

- In `detachSocket` and `close`, clear it:

```js
    if (heartbeatTimer) { clearIntervalFn(heartbeatTimer); heartbeatTimer = null }
```

- In `handleSocketMessage`, ignore `pong` (and any non-response while connected) without treating it as a command:

```js
  if (message.type === MESSAGE_TYPES.pong) return
```

(Place this check before `handleResponse(message)`.)

- [ ] **Step 5: Run tests + check**

Run: `node --test packages/interceptpilot-mcp/tests/websocket-bridge.test.js` (PASS); `node --check packages/interceptpilot-mcp/src/protocol.js packages/interceptpilot-mcp/src/websocket-bridge.js`.

- [ ] **Step 6: Commit**

```bash
git add packages/interceptpilot-mcp/src/protocol.js packages/interceptpilot-mcp/src/websocket-bridge.js packages/interceptpilot-mcp/tests/websocket-bridge.test.js
git commit -m "feat(mcp): server heartbeat ping to keep extension SW alive"
```

---

### Task 6: Extension — answer pings, alarm backstop, cleanup

**Files:**
- Modify: `src/background/ai-bridge-connection.js`
- Create: `src/background/ai-bridge-keepalive.js`
- Modify: `src/background/background.js` (replace the Task 4 stubs with real imports + wire alarm listener)
- Test: `tests/ai-bridge-connection.test.js` *(create)*

**Interfaces:**
- `ai-bridge-connection.js`: on `{type:'ping'}` reply `{type:'pong'}`; ignore pings before handshake; everything else unchanged.
- `ai-bridge-keepalive.js`: `createAiBridgeKeepalive({ alarms, intervalMinutes, onTick })` → `{ start(), stop() }` using `chrome.alarms`; `start()` creates alarm `ai-bridge-keepalive` (period `intervalMinutes`, default 0.5 = 30s) and registers an `onAlarm` handler that calls `onTick`; `stop()` clears the alarm. Plus module singletons `startAiBridgeKeepalive()` / `stopAiBridgeKeepalive()` bound to `chrome.alarms` and a provided tick.

- [ ] **Step 1: Write the failing test (ping → pong)**

Create `tests/ai-bridge-connection.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createAiBridgeConnection } from '../src/background/ai-bridge-connection.js'

class FakeWS {
  constructor() { this.sent = []; FakeWS.last = this }
  send(data) { this.sent.push(JSON.parse(data)) }
  close() { this.onclose && this.onclose() }
}

test('connection replies pong to a ping after handshake', () => {
  const session = { token: 'k'.repeat(64), status: 'waiting', port: 37177 }
  const conn = createAiBridgeConnection({
    WebSocketCtor: FakeWS,
    getSession: () => session,
    markConnected: () => ({ ...session, status: 'connected' }),
    markWaiting: () => ({ ...session, status: 'waiting' }),
    getCommandContext: async () => ({}),
    importBundle: async () => ({}),
    requestRuleAction: async () => ({})
  })
  conn.sync()
  const ws = FakeWS.last
  ws.onopen()
  ws.onmessage({ data: JSON.stringify({ type: 'hello:ack', ok: true, version: 1 }) })
  ws.sent.length = 0
  ws.onmessage({ data: JSON.stringify({ type: 'ping' }) })
  assert.deepEqual(ws.sent, [{ type: 'pong' }])
})
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node --test tests/ai-bridge-connection.test.js`
Expected: FAIL (no pong reply).

- [ ] **Step 3: Implement ping handling**

In `src/background/ai-bridge-connection.js` `handleMessage`, after the `hello:ack` branch and before the `command` branch:

```js
    if (message.type === 'pong') return
    if (message.type === 'ping') {
      if (handshakeAccepted) send({ type: 'pong' })
      return
    }
```

- [ ] **Step 4: Implement the keepalive module**

Create `src/background/ai-bridge-keepalive.js`:

```js
const ALARM_NAME = 'ai-bridge-keepalive'

export function createAiBridgeKeepalive({ alarms, intervalMinutes = 0.5, onTick = () => {} } = {}) {
  let listener = null
  return {
    start() {
      if (!alarms) return
      alarms.create(ALARM_NAME, { periodInMinutes: intervalMinutes })
      if (!listener) {
        listener = alarm => { if (alarm?.name === ALARM_NAME) onTick() }
        alarms.onAlarm.addListener(listener)
      }
    },
    stop() {
      if (!alarms) return
      alarms.clear(ALARM_NAME)
      if (listener) {
        alarms.onAlarm.removeListener(listener)
        listener = null
      }
    }
  }
}
```

- [ ] **Step 5: Wire keepalive in background and remove stubs**

In `src/background/background.js`, remove the temporary `startAiBridgeKeepalive`/`stopAiBridgeKeepalive` stubs from Task 4 and replace with:

```js
import { createAiBridgeKeepalive } from './ai-bridge-keepalive.js'

const aiBridgeKeepalive = createAiBridgeKeepalive({
  alarms: globalThis.chrome?.alarms,
  onTick: () => {
    const session = getAiBridgeSession()
    if (session.status !== AI_BRIDGE_STATUS.disabled) aiBridgeConnection.sync()
  }
})
function startAiBridgeKeepalive() { aiBridgeKeepalive.start() }
function stopAiBridgeKeepalive() { aiBridgeKeepalive.stop() }
```

Ensure `"alarms"` is in `manifest.json` `permissions`. Check and add if missing:

```bash
grep -n '"alarms"' manifest.json || echo "ADD alarms permission to manifest.json"
```

- [ ] **Step 6: Run tests + check**

Run: `node --test tests/ai-bridge-connection.test.js` (PASS); `node --check src/background/ai-bridge-connection.js src/background/ai-bridge-keepalive.js src/background/background.js`.

- [ ] **Step 7: Commit**

```bash
git add src/background/ai-bridge-connection.js src/background/ai-bridge-keepalive.js src/background/background.js manifest.json
git commit -m "feat(ai-bridge): pong replies + chrome.alarms keepalive/reconnect backstop"
```

---

## Phase 3 — UI

### Task 7: AI Bridge page — Start/Stop/Regenerate, config from the stable key

The page must: show Start when disabled, Stop + Regenerate when enabled; show/copy config whenever a key exists; build config from `settings.aiBridgeConnectionKey` (not from the session). Button ids and handlers preserved/extended.

**Files:**
- Modify: `src/fullapp/components/ai-bridge-page.js:106-135`
- Modify: `src/fullapp/fullapp.js:2305-2343` (+ config builder call sites 2335, 2384)
- Modify: locales (Task 8 provides the new keys; reference them here)

**Interfaces:**
- Consumes: `buildAiBridgeMcpConfigText({ key, port, mode })` (Task 2); `settings.aiBridgeConnectionKey`, `settings.aiBridgeConnectionEnabled`.
- Produces: button id `settings-ai-bridge-regenerate-key-btn`; the existing ids `settings-ai-bridge-start-btn`, `settings-ai-bridge-revoke-btn`, `settings-ai-bridge-copy-config-btn`, `settings-ai-bridge-toggle-config-btn` keep working.

- [ ] **Step 1: Update `renderStatusSection`**

In `src/fullapp/components/ai-bridge-page.js`, change `renderStatusSection(session, options)` to also accept settings and key. Replace the config/visibility and actions block:

```js
function renderStatusSection(session, settings = {}, options = {}) {
  const enabled = session.status !== AI_BRIDGE_STATUS.disabled
  const key = String(settings.aiBridgeConnectionKey || '')
  const hasKey = Boolean(key)
  const configText = buildAiBridgeMcpConfigText({ key, port: session.port })
  const configVisible = hasKey && configText && options.configVisible
  return `
    <section class="ai-bridge-page__section ai-bridge-page__status">
      <div class="ai-bridge-page__section-header">
        <div>
          <h3>${escapeHtml(t('fullapp.aiBridgeConnectionTitle'))}</h3>
        </div>
        <span class="badge ai-bridge-page__status-badge" data-state="${escapeHtml(statusBadgeState(session.status))}" data-ai-bridge-status="${escapeHtml(session.status)}">${escapeHtml(statusLabel(session.status))}</span>
      </div>
      <p class="ai-bridge-page__notice">${escapeHtml(statusNotice(session.status))}</p>
      <div class="ai-bridge-page__actions">
        ${enabled
          ? renderButton({ id: 'settings-ai-bridge-revoke-btn', label: t('fullapp.aiBridgeRevokeSession'), variant: 'secondary' })
          : renderButton({ id: 'settings-ai-bridge-start-btn', label: t('fullapp.aiBridgeStartSession'), variant: 'secondary' })}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-copy-config-btn', label: t('fullapp.aiBridgeCopyConfig'), variant: 'secondary' }) : ''}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-toggle-config-btn', label: t(configVisible ? 'fullapp.aiBridgeHideConfig' : 'fullapp.aiBridgeShowConfig'), variant: 'secondary' }) : ''}
        ${hasKey ? renderButton({ id: 'settings-ai-bridge-regenerate-key-btn', label: t('fullapp.aiBridgeRegenerateKey'), variant: 'secondary' }) : ''}
      </div>
      ${configVisible
        ? `
          <p class="ai-bridge-page__config-help">${escapeHtml(t('fullapp.aiBridgeConfigHelp'))}</p>
          <pre class="ai-bridge-page__config" id="settings-ai-bridge-config">${escapeHtml(configText)}</pre>
          <p class="ai-bridge-page__config-help">${escapeHtml(t('fullapp.aiBridgeDevConfigNote'))}</p>
        `
        : ''}
    </section>
  `
}
```

Update the caller in `renderAiBridgePage`:

```js
        ${renderStatusSection(session, state.settings || {}, options)}
```

- [ ] **Step 2: Update fullapp handlers**

In `src/fullapp/fullapp.js`:
- The copy handler (2334-2343) must build from settings key:

```js
  $('#settings-ai-bridge-copy-config-btn')?.addEventListener('click', async () => {
    const configText = buildAiBridgeMcpConfigText({ key: state.settings?.aiBridgeConnectionKey || '', port: state.aiBridgeSession?.port })
    if (!configText) return
    try {
      await copyTextToClipboard(configText)
      toastSuccess(t('toasts.aiBridgeConfigCopied'))
    } catch {
      toastError(t('toasts.copyError'))
    }
  })
```

- Add the regenerate handler (after the copy handler), with a confirm prompt and a re-copy reminder toast:

```js
  $('#settings-ai-bridge-regenerate-key-btn')?.addEventListener('click', async () => {
    if (!window.confirm(t('fullapp.aiBridgeRegenerateKeyConfirm'))) return
    const result = await sendMessage({ type: MSG.AI_BRIDGE_REGENERATE_KEY })
    if (result?.error) {
      toastError(translateBackendError(result.error))
      return
    }
    state.aiBridgeSession = result.aiBridgeSession || createAiBridgeSessionState()
    state.aiBridgeConfigVisible = true
    await refreshState()
    render()
    toastSuccess(t('toasts.aiBridgeKeyRegenerated'))
  })
```

- Anywhere config text is built from a session (e.g. line ~2384 guard `if (!state.aiBridgeSession.token)`), switch the guard to the settings key: `if (!state.settings?.aiBridgeConnectionKey)`.
- After Start/Stop handlers, also `await refreshState()` so the persisted settings (key/enabled) reach `state.settings`.

- [ ] **Step 3: Verify**

Run: `node --check src/fullapp/components/ai-bridge-page.js src/fullapp/fullapp.js`. Confirm `MSG.AI_BRIDGE_REGENERATE_KEY` resolves and `createAiBridgeSessionState` is imported (it already is, per existing handlers).

- [ ] **Step 4: Commit**

```bash
git add src/fullapp/components/ai-bridge-page.js src/fullapp/fullapp.js
git commit -m "feat(ai-bridge): Start/Stop/Regenerate UI driven by stable key"
```

---

### Task 8: Locale strings for the new actions

**Files:**
- Modify: `src/shared/locales/pt-BR.js`, `en.js`, `es.js`

**Interfaces:**
- Produces keys: `aiBridgeRegenerateKey`, `aiBridgeRegenerateKeyConfirm`, `aiBridgeDevConfigNote` (under `fullapp`), and `aiBridgeKeyRegenerated` (under `toasts`). Keep `aiBridgeStartSession`/`aiBridgeRevokeSession` keys but set values to the short labels already agreed (Iniciar/Encerrar, Start/Stop, Iniciar/Detener).

- [ ] **Step 1: Add/adjust pt-BR**

In `src/shared/locales/pt-BR.js` (`fullapp` block): set `aiBridgeStartSession: 'Iniciar'`, `aiBridgeRevokeSession: 'Encerrar'`, and add:

```js
    aiBridgeRegenerateKey: 'Regenerar chave',
    aiBridgeRegenerateKeyConfirm: 'Regenerar a chave invalida a configuração atual. Você precisará copiar e usar a nova configuração no cliente MCP. Continuar?',
    aiBridgeDevConfigNote: 'Modo dev: o pacote ainda não está publicado. Use o comando "node" com o caminho local do servidor em packages/interceptpilot-mcp/src/index.js.',
```

In the `toasts` block add: `aiBridgeKeyRegenerated: 'Chave regenerada. Copie a nova configuração.',`

- [ ] **Step 2: Add/adjust en**

`aiBridgeStartSession: 'Start'`, `aiBridgeRevokeSession: 'Stop'`, and:

```js
    aiBridgeRegenerateKey: 'Regenerate key',
    aiBridgeRegenerateKeyConfirm: 'Regenerating the key invalidates the current configuration. You will need to copy and use the new configuration in your MCP client. Continue?',
    aiBridgeDevConfigNote: 'Dev mode: the package is not published yet. Use the "node" command with the local server path at packages/interceptpilot-mcp/src/index.js.',
```

toasts: `aiBridgeKeyRegenerated: 'Key regenerated. Copy the new configuration.',`

- [ ] **Step 3: Add/adjust es**

`aiBridgeStartSession: 'Iniciar'`, `aiBridgeRevokeSession: 'Detener'`, and:

```js
    aiBridgeRegenerateKey: 'Regenerar clave',
    aiBridgeRegenerateKeyConfirm: 'Regenerar la clave invalida la configuración actual. Tendrás que copiar y usar la nueva configuración en tu cliente MCP. ¿Continuar?',
    aiBridgeDevConfigNote: 'Modo dev: el paquete aún no está publicado. Usa el comando "node" con la ruta local del servidor en packages/interceptpilot-mcp/src/index.js.',
```

toasts: `aiBridgeKeyRegenerated: 'Clave regenerada. Copia la nueva configuración.',`

- [ ] **Step 4: Verify syntax + parity**

```bash
node --check src/shared/locales/pt-BR.js src/shared/locales/en.js src/shared/locales/es.js
node -e "const fs=require('fs');const k=f=>{const s=fs.readFileSync('src/shared/locales/'+f+'.js','utf8');return (s.match(/aiBridge[A-Za-z]+:/g)||[]).sort()};const a=k('pt-BR.js'),b=k('en.js'),c=k('es.js');console.log('parity:',JSON.stringify(a)===JSON.stringify(b)&&JSON.stringify(b)===JSON.stringify(c))"
```

Expected: `parity: true`.

- [ ] **Step 5: Commit**

```bash
git add src/shared/locales/pt-BR.js src/shared/locales/en.js src/shared/locales/es.js
git commit -m "i18n(ai-bridge): labels for stable key actions and dev-config note"
```

---

## Phase 4 — Security

### Task 9: Keep the key out of logs, errors, toasts, and MCP returns

**Files:**
- Modify: `src/background/background.js` (any log/broadcast paths around AI bridge)
- Audit: `src/background/ai-bridge-diagnostics.js`, `src/background/ai-bridge-commands.js`, `src/shared/ai-bridge-sanitize.js`, `src/fullapp/components/import-export-page.js`
- Test: `tests/ai-bridge-security.test.js` *(create)*

**Interfaces:**
- Consumes: `redactAiBridgeKey` (Task 1).
- Guarantee: no MCP command context or result includes the key; settings export excludes `aiBridgeConnectionKey`; any error/log string passes through `redactAiBridgeKey` before `pushLog`/broadcast.

- [ ] **Step 1: Write the failing test**

Create `tests/ai-bridge-security.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { getCurrentTestContext } from '../src/background/ai-bridge-commands.js'

test('current test context never includes the connection key/token', () => {
  const key = 'k'.repeat(64)
  const ctx = getCurrentTestContext({
    state: { settings: { aiBridgeConnectionKey: key, activeCollectionId: 'c1' }, collections: [], rules: [] },
    captureContext: {},
    aiBridgeStatus: 'connected',
    aiBridgePermissions: {}
  })
  assert.equal(JSON.stringify(ctx).includes(key), false)
})
```

> Adjust the `getCurrentTestContext` call shape to match its real signature in `ai-bridge-commands.js`; the assertion (no key in the serialized result) is the invariant.

- [ ] **Step 2: Run it to confirm current behavior**

Run: `node --test tests/ai-bridge-security.test.js`
Expected: PASS already if commands never read the key (likely), or FAIL if any command echoes settings verbatim. If it passes, keep it as a regression guard.

- [ ] **Step 3: Add redaction at log/broadcast boundaries**

Audit results to implement:
- In `background.js`, wherever an AI-bridge error or diagnostic string is sent to `pushLog` or `broadcast`, wrap the message: `redactAiBridgeKey(message, getState-key)`. Add a small local helper:

```js
async function redactedAiBridgeLog(message) {
  const state = await getState()
  return redactAiBridgeKey(String(message ?? ''), String(state.settings?.aiBridgeConnectionKey || ''))
}
```

and use it for any AI-bridge log line that could interpolate connection data. Import `redactAiBridgeKey` from `../shared/ai-bridge-state.js`.
- Confirm `getCommandContext` (background ~610-626) passes only `aiBridgeStatus` and `aiBridgePermissions` — it must **not** pass the key. Leave as-is if already clean; add a comment marking the invariant.

- [ ] **Step 4: Exclude the key from settings export (if settings are exported)**

```bash
grep -rnE "aiBridgeConnectionKey|settings" src/fullapp/components/import-export-page.js src/background/ai-bridge-imports.js
```

If settings (or a subset) are exportable, strip `aiBridgeConnectionKey` (and `aiBridgeConnectionEnabled`) before serialization. If settings are not exported, record that here and skip.

- [ ] **Step 5: Run tests + check**

Run: `node --test` (all green); `node --check` on every file touched.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "security(ai-bridge): redact connection key from logs/errors/exports; assert MCP returns are clean"
```

---

## Phase 5 — Verification

### Task 10: End-to-end manual verification

- [ ] **Step 1: Full unit suite**

Run: `node --test` (root) and `node --test` inside `packages/interceptpilot-mcp`. Expected: all green.

- [ ] **Step 2: Stable-config reuse**

Load the unpacked extension. On the AI Bridge page: with no key yet, press **Iniciar** → a key is generated, status goes to Aguardando conexão, **Copiar configuração** / **Mostrar configuração** / **Regenerar chave** appear. Copy the config. Register it in an MCP client (use the dev/local `node` form with the real local path, since the package is unpublished). Confirm the client connects and status flips to **Conectado**.

- [ ] **Step 3: Reliability across idle + SW death**

Leave the page idle > 1 minute, then call an MCP tool (e.g. `get_current_test_context`). Expected: still **Conectado** (no "extension is not connected"). Then kill the SW (chrome://extensions → service worker → terminate) and call a tool again. Expected: it reconnects (alarm backstop) and answers; UI returns to Conectado.

- [ ] **Step 4: Stop keeps the key**

Press **Encerrar**. Status → Desligado; the same copied config in the MCP client must reconnect after pressing **Iniciar** again **without** re-copying (key unchanged).

- [ ] **Step 5: Regenerate invalidates old config**

Press **Regenerar chave**. The previously-registered MCP client (old key) must fail to connect; copy the new config, update the client, confirm it connects. Confirm permissions are unchanged after regenerate.

- [ ] **Step 6: Secrecy spot-check**

Trigger a connection error (wrong key in client). Confirm no toast, log line, or MCP response contains the key. `git diff --check` clean.

---

## Self-Review

- **Reliability (req 1):** server heartbeat (Task 5) + extension pong + `chrome.alarms` backstop (Task 6) + persisted enabled flag auto-connect (Task 4) cover keepalive, reconnect on MCP drop/return, and UI status. Cleanup on stop in Task 4/6 (`disconnect` + `stopAiBridgeKeepalive`) and server-side timer clear in Task 5.
- **Stable key (req 2):** key persisted in settings (Task 1), config from key (Task 2), Start/Stop/Regenerate (Tasks 4, 7); copy-once-stays-valid (config available whenever key exists, Task 7); Stop keeps key (Task 4 `revokeSession` no longer wipes settings key); regenerate invalidates old config (Task 4) and requires re-copy (Task 7 toast/confirm).
- **Security (req 3):** redaction + clean MCP returns + export exclusion (Task 9); session stays temporary (Task 3); permissions separate from key (unchanged permissions module); Stop cuts current access (Task 4 disconnect); regenerate invalidates old clients (Task 4).
- **MCP config (req 4):** config uses the stable key (Task 2/7); local/dev mode handled clearly via `mode: 'local'` + `aiBridgeDevConfigNote` (Tasks 2, 8); no npm publish performed.
- **Placeholder scan:** signatures and code are concrete; the two audit-dependent spots (Task 9 export check; exact `getCurrentTestContext` call shape) are explicitly flagged to confirm against the real file before coding, not left as silent TBDs.
- **Type/key consistency:** `startAiBridgeSession({ key, defaultPermissions })`, `stopAiBridgeSession()`, `buildAiBridgeMcpConfig({ key, port, mode })`, `generateAiBridgeConnectionKey()`, `redactAiBridgeKey()`, message `AI_BRIDGE_REGENERATE_KEY`, button id `settings-ai-bridge-regenerate-key-btn`, locale keys `aiBridgeRegenerateKey`/`aiBridgeRegenerateKeyConfirm`/`aiBridgeDevConfigNote`/`aiBridgeKeyRegenerated` are used consistently across tasks.

---

## Observation (not a task)

- **`.claude.json` drive-letter casing:** local MCP registration via `claude mcp add` wrote the server under project key `D:/...` while the running VS Code session keyed it as `d:/...`, so tools loaded only after mirroring it into the lowercase key. Environment/tooling caveat for local testing, not a product change.
