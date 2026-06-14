import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

test('full app scroll state tracks split data tables, not only data panel scroll containers', () => {
  assert.match(source, /querySelectorAll\('\.data-table'\)/)
  assert.match(source, /querySelector\('\.data-table__rows'\)/)
  assert.match(source, /table\.classList\.toggle\('is-scrollable-y', hasVerticalScroll\)/)
})
