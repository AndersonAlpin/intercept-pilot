import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/background/background.js', import.meta.url), 'utf8')

test('AI Bridge session restart and revoke clear pending import proposals', () => {
  const startBlock = source.match(/case 'aiBridge:startSession': \{[\s\S]*?return\n\s+\}/)?.[0] || ''
  const revokeBlock = source.match(/case 'aiBridge:revokeSession': \{[\s\S]*?return\n\s+\}/)?.[0] || ''

  assert.match(startBlock, /cancelPendingAiImport\(\)/)
  assert.match(startBlock, /broadcastAiBridgeImport\(\)/)
  assert.match(revokeBlock, /cancelPendingAiImport\(\)/)
  assert.match(revokeBlock, /broadcastAiBridgeImport\(\)/)
})
