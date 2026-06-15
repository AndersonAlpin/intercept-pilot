import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/sidepanel/sidepanel.js', import.meta.url), 'utf8')

test('sidepanel render preserves internal tab list scroll positions across rerenders', () => {
  assert.match(source, /function captureScrollSnapshot\(\)/)
  assert.match(source, /selector:\s*'\.rules-panel > \.list'/)

  const renderBlock = source.match(/function render\(\) \{[\s\S]*?\n\}/)?.[0] || ''
  assert.match(renderBlock, /const scrollSnapshot = captureScrollSnapshot\(\)/)
  assert.match(renderBlock, /restoreScrollSnapshot\(scrollSnapshot\)/)
})
