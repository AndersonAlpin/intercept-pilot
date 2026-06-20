import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { getCurrentTestContext } from '../src/background/ai-bridge-commands.js'

const backgroundSource = readFileSync(new URL('../src/background/background.js', import.meta.url), 'utf8').replace(/\r\n/g, '\n')

test('current test context never includes the connection key', () => {
  const key = 'k'.repeat(64)
  const ctx = getCurrentTestContext({
    state: {
      settings: { aiBridgeConnectionKey: key, activeCollectionId: 'c1' },
      collections: [],
      rules: [],
      aiBridgeStatus: 'connected'
    }
  })

  assert.equal(JSON.stringify(ctx).includes(key), false)
})

test('AI Bridge command context does not forward the connection key to MCP commands', () => {
  const contextBlock = backgroundSource.match(/async function getAiBridgeCommandContext\(\)[\s\S]*?\n\}/)?.[0] || ''

  assert.doesNotMatch(contextBlock, /aiBridgeConnectionKey/)
})

test('Stop keeps the stable key (only the enabled flag is cleared)', () => {
  const revokeBlock = backgroundSource.match(/case 'aiBridge:revokeSession': \{[\s\S]*?return\n\s+\}/)?.[0] || ''

  assert.match(revokeBlock, /aiBridgeConnectionEnabled: false/)
  assert.doesNotMatch(revokeBlock, /aiBridgeConnectionKey/)
})
