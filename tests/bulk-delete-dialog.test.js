import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale, t } from '../src/shared/i18n.js'
import { getBulkDeleteDialogCopy, getBulkDeleteSuccessMessage } from '../src/shared/bulk-delete-dialog.js'

test('bulk rule deletion dialog uses selected rules copy', () => {
  setLocale('pt-BR')

  const copy = getBulkDeleteDialogCopy('rules', 2)

  assert.equal(copy.title, 'Excluir regras selecionadas?')
  assert.equal(copy.message, 'As 2 regras selecionadas serão removidas da coleção.\nEssa ação não pode ser desfeita.')
  assert.equal(copy.confirmLabel, 'Excluir')
})

test('single rule deletion copy explains the consequence', () => {
  setLocale('pt-BR')

  assert.equal(t('rules.deleteTitle'), 'Excluir esta regra?')
  assert.equal(t('rules.deleteConfirm'), 'A regra será removida da coleção.\nEssa ação não pode ser desfeita.')
})

test('bulk rule deletion success uses selected rules copy', () => {
  setLocale('pt-BR')

  const message = getBulkDeleteSuccessMessage('rules', 2)

  assert.equal(message, '2 regras selecionadas excluídas.')
})

test('bulk collection deletion dialog uses selected collections copy', () => {
  setLocale('pt-BR')

  const copy = getBulkDeleteDialogCopy('collections', 2)

  assert.equal(copy.title, 'Excluir coleções selecionadas?')
  assert.equal(copy.message, 'As 2 coleções selecionadas e todas as regras dentro delas serão removidas.\nEssa ação não pode ser desfeita.')
  assert.equal(copy.confirmLabel, 'Excluir')
})

test('single collection deletion copy includes the collection name', () => {
  setLocale('pt-BR')

  assert.equal(t('collections.deleteTitle'), 'Excluir esta coleção?')
  assert.equal(
    t('collections.deleteConfirm', { name: 'Planos BRL' }),
    'A coleção “Planos BRL” e todas as suas regras serão removidas.\nEssa ação não pode ser desfeita.'
  )
})

test('bulk collection deletion success uses selected collections copy', () => {
  setLocale('pt-BR')

  const message = getBulkDeleteSuccessMessage('collections', 2)

  assert.equal(message, '2 coleções selecionadas excluídas.')
})
