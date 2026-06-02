import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { getBulkDeleteDialogCopy } from '../src/shared/bulk-delete-dialog.js'

test('bulk rule deletion dialog uses selected rules copy', () => {
  setLocale('pt-BR')

  const copy = getBulkDeleteDialogCopy('rules', 2)

  assert.equal(copy.title, 'Excluir regras selecionadas')
  assert.equal(copy.message, 'Excluir 2 regras selecionadas?')
  assert.equal(copy.confirmLabel, 'Excluir')
})

test('bulk collection deletion dialog uses selected collections copy', () => {
  setLocale('pt-BR')

  const copy = getBulkDeleteDialogCopy('collections', 2)

  assert.equal(copy.title, 'Excluir coleções selecionadas')
  assert.equal(copy.message, 'Excluir 2 coleções selecionadas? As regras dessas coleções também serão removidas.')
  assert.equal(copy.confirmLabel, 'Excluir')
})
