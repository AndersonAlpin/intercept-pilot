import test from 'node:test'
import assert from 'node:assert/strict'

import { detectSimpleConflicts, findMatchingRule, getExecutableRules } from '../src/background/rule-engine.js'

const collections = [
  { id: 'collection-active', name: 'Active', enabled: true },
  { id: 'collection-other', name: 'Other', enabled: true }
]

const baseRule = {
  enabled: true,
  priority: 100,
  match: {
    method: 'GET',
    matchType: 'contains',
    urlPattern: '/stripe/subscription',
    resourceType: 'ANY'
  },
  action: { type: 'mockResponse', statusCode: 200 }
}

test('executable rules are limited to the active enabled collection', () => {
  const rules = [
    { ...baseRule, id: 'rule-active', collectionId: 'collection-active' },
    { ...baseRule, id: 'rule-other', collectionId: 'collection-other' }
  ]

  assert.deepEqual(
    getExecutableRules(rules, collections, { activeCollectionId: 'collection-active' }).map(rule => rule.id),
    ['rule-active']
  )
})

test('matching ignores rules from other enabled collections', () => {
  const rules = [
    { ...baseRule, id: 'rule-other', collectionId: 'collection-other', priority: 999 },
    { ...baseRule, id: 'rule-active', collectionId: 'collection-active', priority: 1 }
  ]

  const match = findMatchingRule(
    rules,
    collections,
    { activeCollectionId: 'collection-active' },
    'https://example.com/stripe/subscription',
    'GET',
    'Fetch'
  )

  assert.equal(match.id, 'rule-active')
})

test('conflict detection ignores duplicate rules outside the active collection', () => {
  const rules = [
    { ...baseRule, id: 'rule-active', collectionId: 'collection-active' },
    { ...baseRule, id: 'rule-other', collectionId: 'collection-other' }
  ]

  const executableRules = getExecutableRules(rules, collections, { activeCollectionId: 'collection-active' })
  const conflicts = detectSimpleConflicts(executableRules)

  assert.deepEqual(conflicts.get('rule-active') || [], [])
})
