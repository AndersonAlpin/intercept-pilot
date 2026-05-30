import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function runBrowserScript(filePath, globals) {
  const code = fs.readFileSync(filePath, 'utf8')
  vm.runInNewContext(code, globals, { filename: filePath })
}

test('compat main emits page log events for console calls', () => {
  const postedMessages = []
  const consoleCalls = []
  const listeners = new Map()
  const fakeWindow = {
    fetch: async () => ({ ok: true }),
    location: { href: 'https://example.test/app' },
    crypto: { randomUUID: () => 'test-id' },
    console: {
      log: (...args) => consoleCalls.push(['log', args]),
      warn: (...args) => consoleCalls.push(['warn', args]),
      error: (...args) => consoleCalls.push(['error', args])
    },
    postMessage: message => postedMessages.push(message),
    addEventListener: (type, listener) => listeners.set(type, listener)
  }

  runBrowserScript('src/content/compat-main.js', { window: fakeWindow })

  fakeWindow.console.warn('Heads up', 42, { ok: true })

  const pageLog = postedMessages.find(message => message.type === 'interceptpilot:compat:pageLog')
  assert.equal(pageLog?.source, 'interceptpilot-compat-main')
  assert.equal(pageLog?.payload.level, 'warn')
  assert.equal(pageLog?.payload.message, 'Heads up 42 {"ok":true}')
  assert.equal(pageLog?.payload.url, 'https://example.test/app')
  assert.equal(consoleCalls.length, 1)
})

test('compat bridge forwards page log events to the background', async () => {
  const runtimeMessages = []
  const listeners = new Map()
  const fakeWindow = {
    location: { protocol: 'https:' },
    addEventListener: (type, listener) => listeners.set(type, listener),
    postMessage: () => {}
  }
  const fakeDocument = {
    createElement: () => ({ dataset: {}, remove: () => {} }),
    documentElement: { appendChild: () => {} },
    head: null,
    body: null,
    addEventListener: () => {}
  }
  const fakeChrome = {
    runtime: {
      getURL: path => `chrome-extension://test/${path}`,
      sendMessage: async message => {
        runtimeMessages.push(message)
        return message.type === 'compat:getMode' ? { captureMode: 'cdp' } : { ok: true }
      },
      onMessage: { addListener: () => {} }
    }
  }

  runBrowserScript('src/content/compat-bridge.js', {
    window: fakeWindow,
    document: fakeDocument,
    location: fakeWindow.location,
    chrome: fakeChrome
  })

  await listeners.get('message')({
    source: fakeWindow,
    data: {
      source: 'interceptpilot-compat-main',
      type: 'interceptpilot:compat:pageLog',
      payload: { level: 'error', message: 'Boom', url: 'https://example.test/app' }
    }
  })

  const forwarded = JSON.parse(JSON.stringify(runtimeMessages.at(-1)))
  assert.deepEqual(forwarded, {
    type: 'compat:pageLog',
    payload: { level: 'error', message: 'Boom', url: 'https://example.test/app' }
  })
})
