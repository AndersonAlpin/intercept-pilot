import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const css = fs.readFileSync(new URL('../src/sidepanel/sidepanel.css', import.meta.url), 'utf8')

test('sidepanel capture context stacks status, tab title and capture mode', () => {
  assert.match(css, /\.capture-context\s*\{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s)
  assert.match(css, /\.attach-status\s*\{[^}]*display:\s*flex;/s)
})
