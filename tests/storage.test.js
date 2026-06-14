import test from 'node:test'
import assert from 'node:assert/strict'

import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../src/shared/constants.js'
import { deleteCollection, deleteCollections, deleteRules, ensureState, getState, getReleaseNotesState, markReleaseNotesSeen, moveRulesToCollection } from '../src/shared/storage.js'

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

test('moveRulesToCollection moves selected rules while preserving rule data', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 },
      { id: 'collection-source', name: 'Source', enabled: true, order: 1 },
      { id: 'collection-target', name: 'Target', enabled: true, order: 2 }
    ],
    [STORAGE_KEYS.rules]: [
      {
        id: 'rule-a',
        collectionId: 'collection-source',
        name: 'Rule A',
        enabled: false,
        match: { method: 'GET', urlPattern: '/a' },
        action: { type: 'mockResponse', statusCode: 201 },
        diagnostics: { matchCount: 7, lastMatchedAt: '2026-06-14T10:00:00.000Z' },
        createdAt: '2026-06-01T10:00:00.000Z',
        updatedAt: '2026-06-02T10:00:00.000Z'
      },
      { id: 'rule-b', collectionId: 'collection-source', name: 'Rule B' },
      { id: 'rule-c', collectionId: 'collection-default', name: 'Rule C' }
    ],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, activeCollectionId: 'collection-source' },
    [STORAGE_KEYS.logs]: []
  })

  const rules = await moveRulesToCollection(['rule-a', 'rule-b'], 'collection-target')

  const movedRule = rules.find(rule => rule.id === 'rule-a')
  assert.equal(movedRule.collectionId, 'collection-target')
  assert.equal(movedRule.enabled, false)
  assert.deepEqual(movedRule.match, { method: 'GET', urlPattern: '/a' })
  assert.deepEqual(movedRule.action, { type: 'mockResponse', statusCode: 201 })
  assert.deepEqual(movedRule.diagnostics, { matchCount: 7, lastMatchedAt: '2026-06-14T10:00:00.000Z' })
  assert.equal(movedRule.createdAt, '2026-06-01T10:00:00.000Z')
  assert.notEqual(movedRule.updatedAt, '2026-06-02T10:00:00.000Z')
  assert.equal(data[STORAGE_KEYS.rules].find(rule => rule.id === 'rule-b').collectionId, 'collection-target')
  assert.equal(data[STORAGE_KEYS.rules].find(rule => rule.id === 'rule-c').collectionId, 'collection-default')
})

test('moveRulesToCollection ignores same or missing destination collections', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 },
      { id: 'collection-source', name: 'Source', enabled: true, order: 1 }
    ],
    [STORAGE_KEYS.rules]: [
      { id: 'rule-a', collectionId: 'collection-source', name: 'Rule A' }
    ],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, activeCollectionId: 'collection-source' },
    [STORAGE_KEYS.logs]: []
  })

  assert.deepEqual(await moveRulesToCollection(['rule-a'], 'collection-source'), data[STORAGE_KEYS.rules])
  assert.deepEqual(await moveRulesToCollection(['rule-a'], 'missing-collection'), data[STORAGE_KEYS.rules])
  assert.equal(data[STORAGE_KEYS.rules][0].collectionId, 'collection-source')
})

test('release notes seen state is stored outside settings', async () => {
  const data = installChromeStorageMock({
    [STORAGE_KEYS.collections]: [
      { id: 'collection-default', name: 'Default', enabled: true, order: 0 }
    ],
    [STORAGE_KEYS.rules]: [],
    [STORAGE_KEYS.settings]: { ...DEFAULT_SETTINGS, lastSeenReleaseNotesVersion: 'old-settings-value' },
    [STORAGE_KEYS.logs]: [],
    [STORAGE_KEYS.releaseNotesLastSeenVersion]: '1.1.0',
    [STORAGE_KEYS.releaseNotesLastSeenAt]: 1710000000000
  })

  assert.equal('lastSeenReleaseNotesVersion' in DEFAULT_SETTINGS, false)

  assert.deepEqual(await getReleaseNotesState(), {
    lastSeenVersion: '1.1.0',
    lastSeenAt: 1710000000000
  })
  assert.equal((await getState()).settings.lastSeenReleaseNotesVersion, undefined)
  await ensureState()

  await markReleaseNotesSeen('1.2.0', 1720000000000)

  assert.equal(data[STORAGE_KEYS.releaseNotesLastSeenVersion], '1.2.0')
  assert.equal(data[STORAGE_KEYS.releaseNotesLastSeenAt], 1720000000000)
  assert.equal(data[STORAGE_KEYS.settings].lastSeenReleaseNotesVersion, undefined)
})
