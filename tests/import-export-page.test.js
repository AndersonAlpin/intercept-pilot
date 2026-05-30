import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { renderImportExportPage } from '../src/fullapp/components/import-export-page.js'

test('import page puts templates menu beside JSON file action and removes templates block', () => {
  setLocale('pt-BR')
  const html = renderImportExportPage({ lastImportExportMessage: '' })

  assert.doesNotMatch(html, /class="import-template-actions"/)
  assert.match(html, /class="[^"]*\bdropdown-menu\b/)
  assert.match(html, /class="[^"]*\bdropdown-menu__item\b/)
  assert.doesNotMatch(html, /data-import-template-action="copy-collection"[^>]*class="[^"]*\bbtn\b/)
  assert.match(html, /id="full-import-pick-file-btn"[^>]*>[\s\S]*<svg[\s\S]*Arquivo JSON/)
  assert.doesNotMatch(html, />Escolher arquivo JSON</)

  const templatesIndex = html.indexOf('id="full-import-templates-menu"')
  const fileIndex = html.indexOf('id="full-import-pick-file-btn"')
  assert.ok(templatesIndex > -1)
  assert.ok(fileIndex > -1)
  assert.ok(templatesIndex < fileIndex)
})
