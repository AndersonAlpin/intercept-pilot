import test from 'node:test'
import assert from 'node:assert/strict'

import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE, SCHEMA_VERSION } from '../src/shared/export.js'
import { FAIL_REASONS, MATCH_TYPES, RESOURCE_TYPES } from '../src/shared/constants.js'
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
      'Fail reasons: {failReasons}.',
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
  assert.match(prompt, new RegExp(FAIL_REASONS.join(', ')))
  assert.match(prompt, /schemaVersion/)
  assert.doesNotMatch(prompt, /```/)
})

test('AI prompt distinguishes HTTP status mocks from network failures', () => {
  const prompt = getAiPrompt()

  assert.match(prompt, /mockResponse to simulate any HTTP response status code from 100 to 599/)
  assert.match(prompt, /301 Moved Permanently/)
  assert.match(prompt, /401 Unauthorized/)
  assert.match(prompt, /500 Internal Server Error/)
  assert.match(prompt, /Location response header/)
  assert.match(prompt, /failRequest only for network-level failures where no HTTP response should exist/)
  assert.match(prompt, new RegExp(MATCH_TYPES.join(', ')))
  assert.match(prompt, new RegExp(RESOURCE_TYPES.join(', ')))
  assert.match(prompt, /Fields by action\.type:/)
  assert.match(prompt, /Do not use statusCode for network failures/)
  assert.match(prompt, /responseBody must be a string/)
  assert.match(prompt, /Allowed failReason values:/)
})

test('localized AI prompt states that bundles intercept requests to test scenarios', () => {
  setLocale('pt-BR')
  const prompt = getAiPrompt(t)

  assert.match(prompt, /cen[aá]rios de API/i)
  assert.match(prompt, /erros HTTP/i)
  assert.match(prompt, /falhas de rede/i)
})
