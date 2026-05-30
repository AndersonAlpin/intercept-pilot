import test from 'node:test'
import assert from 'node:assert/strict'

import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE, SCHEMA_VERSION } from '../src/shared/export.js'
import { parseImportBundle } from '../src/shared/import-bundles.js'
import { setLocale, t } from '../src/shared/i18n.js'
import { buildCollectionTemplate, buildRuleTemplate, getAiPrompt } from '../src/shared/import-template.js'

function tt(key, vars = {}) {
  const values = {
    'importTemplate.aiPrompt': [
      'Return ONLY valid JSON.',
      'Use {schemaVersion}.',
      'Collection type: {collectionType}.',
      'Rule type: {ruleType}.',
      'Name rules clearly for the test scenario.',
      'Collection JSON example: {collectionExample}',
      'Rule JSON example: {ruleExample}'
    ].join('\n')
  }
  let value = values[key] || key
  for (const [name, varValue] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(varValue))
  }
  return value
}

test('collection template is a valid importable bundle with clear scenario rules', () => {
  const bundle = buildCollectionTemplate()
  const parsed = parseImportBundle(JSON.stringify(bundle))

  assert.equal(parsed.error, undefined)
  assert.equal(parsed.bundle.schemaVersion, SCHEMA_VERSION)
  assert.equal(parsed.bundle.type, BUNDLE_TYPE_COLLECTION)
  assert.equal(parsed.bundle.collection.id, 'collection-template-api-scenarios')
  assert.equal(parsed.bundle.rules.length, 3)
  assert.deepEqual(parsed.bundle.rules.map(rule => rule.action.type), ['mockResponse', 'failRequest', 'delayOnly'])
  assert.ok(parsed.bundle.rules.every(rule => rule.collectionId === parsed.bundle.collection.id))
  assert.ok(parsed.bundle.rules.every(rule => !/^rule\s*\d*$/i.test(rule.name)))
  assert.ok(parsed.bundle.rules.some(rule => /Mock .*200/i.test(rule.name)))
  assert.ok(parsed.bundle.rules.some(rule => /Fail/i.test(rule.name)))
  assert.ok(parsed.bundle.rules.some(rule => /Delay/i.test(rule.name)))
})

test('single rule template is a valid importable rule bundle', () => {
  const bundle = buildRuleTemplate()
  const parsed = parseImportBundle(JSON.stringify(bundle))

  assert.equal(parsed.error, undefined)
  assert.equal(parsed.bundle.schemaVersion, SCHEMA_VERSION)
  assert.equal(parsed.bundle.type, BUNDLE_TYPE_RULE)
  assert.equal(parsed.bundle.rule.action.type, 'mockResponse')
  assert.match(parsed.bundle.rule.name, /Mock .*200/i)
})

test('AI prompt explains both import formats and asks for JSON only', () => {
  const prompt = getAiPrompt(tt)

  assert.match(prompt, /ONLY valid JSON/)
  assert.match(prompt, new RegExp(BUNDLE_TYPE_COLLECTION.replace('.', '\\.')))
  assert.match(prompt, new RegExp(BUNDLE_TYPE_RULE.replace('.', '\\.')))
  assert.match(prompt, /Name rules clearly/)
  assert.match(prompt, /schemaVersion/)
  assert.doesNotMatch(prompt, /```/)
})

test('localized AI prompt states that bundles intercept requests to test scenarios', () => {
  setLocale('pt-BR')
  const prompt = getAiPrompt(t)

  assert.match(prompt, /interceptar requests/i)
  assert.match(prompt, /testar cen[aá]rios/i)
})
