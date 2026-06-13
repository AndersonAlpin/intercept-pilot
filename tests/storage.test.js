import test from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../src/shared/constants.js'
import { deleteCollection, deleteCollections, deleteRules } from '../src/shared/storage.js'

function installChromeStorageMock(initialState) {
  const data = { ...initialState }
  globalThis.chrome = {
    storage: {
      local: {
        async get(keys) {
          if (!Array.isArray(keys)) return { ...data }
          return Object.fromEntries(keys.map(key => [key, data[key]]))
        },
        async set(next) {
          Object.assign(data, next)
        }
      },
      onChanged: {
        addListener() {},
        removeListener() {}
      }
    }
  }
  return data
}

test('deleteCollection removes rules from the deleted collection instead of moving them to default', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 },
      { id: 'collection-copy', name: 'Copy', enabled: true, order: 1 }
    ],
    [STORAGE_KEYS.rules]: [
      { id: 'rule-default', collectionId: 'collection-default', name: 'Default rule' },
      { id: 'rule-copy-a', collectionId: 'collection-copy', name: 'Copy rule A' },
      { id: 'rule-copy-b', collectionId: 'collection-copy', name: 'Copy rule B' }
    ],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, activeCollectionId: 'collection-copy' },
    [STORAGE_KEYS.logs]: []
  })

  const collections = await deleteCollection('collection-copy')

  assert.deepEqual(collections.map(collection => collection.id), ['collection-default'])
  assert.deepEqual(data[STORAGE_KEYS.rules].map(rule => rule.id), ['rule-default'])
  assert.equal(data[STORAGE_KEYS.settings].activeCollectionId, 'collection-default')
})

test('deleteRules removes multiple selected rules', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 }
    ],
    [STORAGE_KEYS.rules]: [
      { id: 'rule-a', collectionId: 'collection-default', name: 'Rule A' },
      { id: 'rule-b', collectionId: 'collection-default', name: 'Rule B' },
      { id: 'rule-c', collectionId: 'collection-default', name: 'Rule C' }
    ],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, activeCollectionId: 'collection-default' },
    [STORAGE_KEYS.logs]: []
  })

  const rules = await deleteRules(['rule-a', 'rule-c'])

  assert.deepEqual(rules.map(rule => rule.id), ['rule-b'])
  assert.deepEqual(data[STORAGE_KEYS.rules].map(rule => rule.id), ['rule-b'])
})

test('deleteCollections removes multiple collections and their rules while preserving default', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 },
      { id: 'collection-a', name: 'A', enabled: true, order: 1 },
      { id: 'collection-b', name: 'B', enabled: true, order: 2 }
    ],
    [STORAGE_KEYS.rules]: [
      { id: 'rule-default', collectionId: 'collection-default', name: 'Default rule' },
      { id: 'rule-a', collectionId: 'collection-a', name: 'A rule' },
      { id: 'rule-b', collectionId: 'collection-b', name: 'B rule' }
    ],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, activeCollectionId: 'collection-b' },
    [STORAGE_KEYS.logs]: []
  })

  const collections = await deleteCollections(['collection-default', 'collection-a', 'collection-b'])

  assert.deepEqual(collections.map(collection => collection.id), ['collection-default'])
  assert.deepEqual(data[STORAGE_KEYS.rules].map(rule => rule.id), ['rule-default'])
  assert.equal(data[STORAGE_KEYS.settings].activeCollectionId, 'collection-default')
})
