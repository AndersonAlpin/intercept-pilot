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

test('import page disabled JSON import button explains why it is inactive', () => {
  setLocale('pt-BR')
  const html = renderImportExportPage({ lastImportExportMessage: '' })

  assert.match(html, /class="btn-tooltip-wrapper"/)
  assert.match(html, /tabindex="0"/)
  assert.match(html, /data-tooltip="Cole um JSON válido para importar"/)
  assert.match(html, /<button[^>]*id="full-import-json-btn"[^>]*disabled/)
})

test('import page exposes a localized JSON dropzone without replacing manual paste', () => {
  setLocale('en')
  const html = renderImportExportPage({ lastImportExportMessage: '' })

  assert.match(html, /id="full-import-dropzone"/)
  assert.match(html, /class="[^"]*\bimport-dropzone\b/)
  assert.match(html, /data-import-dropzone="true"/)
  assert.doesNotMatch(html, /import-dropzone__hint/)
  assert.match(html, /placeholder="Paste JSON here or drop a \.json file"/)
  assert.match(html, /id="full-import-json"/)
  assert.match(html, /id="full-import-pick-file-btn"/)
})
