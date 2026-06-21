import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

test('manual import keeps generic success feedback by default', () => {
  const importRuleBundle = source.match(/async function importRuleBundle\(bundle, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''
  const importCollectionCopy = source.match(/async function importCollectionBundleAsCopy\(bundle, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''
  const importCollectionUpdate = source.match(/async function importCollectionBundleAsUpdate\(bundle, existingCollection, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(importRuleBundle, /const \{ silentSuccess = false \} = options/)
  assert.match(importRuleBundle, /if \(!silentSuccess\) toastSuccess\(t\('toasts\.ruleImported'\)\)/)
  assert.match(importCollectionCopy, /const \{ silentSuccess = false \} = options/)
  assert.match(importCollectionCopy, /if \(!silentSuccess\) toastSuccess\(t\('toasts\.collectionImported'\)\)/)
  assert.match(importCollectionUpdate, /const \{ silentSuccess = false \} = options/)
  assert.match(importCollectionUpdate, /if \(!silentSuccess\) toastSuccess\(t\('toasts\.collectionUpdated'\)\)/)
})

test('AI import confirmation suppresses generic import success feedback', () => {
  const importParsedBundle = source.match(/async function importParsedBundle\(bundle, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''
  const importCollectionBundle = source.match(/async function importCollectionBundle\(bundle, options = \{\}\) \{[\s\S]*?\n\}/)?.[0] || ''
  const confirmAiBridgePendingImport = source.match(/async function confirmAiBridgePendingImport\(\) \{[\s\S]*?toastSuccess\(t\('toasts\.aiImportConfirmed'\)\)[\s\S]*?\n\}/)?.[0] || ''
  const cancelAiBridgePendingImport = source.match(/async function cancelAiBridgePendingImport\(\) \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(importParsedBundle, /return importRuleBundle\(bundle, options\)/)
  assert.match(importParsedBundle, /return importCollectionBundle\(bundle, options\)/)
  assert.match(importCollectionBundle, /return importCollectionBundleAsUpdate\(bundle, existingCollection, options\)/)
  assert.match(importCollectionBundle, /return importCollectionBundleAsCopy\(bundle, options\)/)
  assert.match(confirmAiBridgePendingImport, /importParsedBundle\(pendingImport\.bundle, \{ silentSuccess: true \}\)/)
  assert.match(confirmAiBridgePendingImport, /toastSuccess\(t\('toasts\.aiImportConfirmed'\)\)/)
  assert.doesNotMatch(cancelAiBridgePendingImport, /aiImportConfirmed|ruleImported|collectionImported|collectionUpdated/)
})

test('AI proposal cancellation does not show success feedback', () => {
  const cancelAiBridgePendingImport = source.match(/async function cancelAiBridgePendingImport\(\) \{[\s\S]*?render\(\)\n\}/)?.[0] || ''
  const cancelAiBridgePendingAction = source.match(/async function cancelAiBridgePendingAction\(\) \{[\s\S]*?render\(\)\n\}/)?.[0] || ''

  assert.match(cancelAiBridgePendingImport, /AI_BRIDGE_CANCEL_PENDING_IMPORT/)
  assert.match(cancelAiBridgePendingAction, /AI_BRIDGE_CANCEL_PENDING_ACTION/)
  assert.doesNotMatch(cancelAiBridgePendingImport, /toastSuccess|toastInfo|aiImportCanceled/)
  assert.doesNotMatch(cancelAiBridgePendingAction, /toastSuccess|toastInfo|aiActionCanceled/)
})
