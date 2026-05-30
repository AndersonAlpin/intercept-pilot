import { BUNDLE_TYPE_COLLECTION, BUNDLE_TYPE_RULE, SCHEMA_VERSION, createCollectionBundle, createRuleBundle } from './export.js'
import { makeCollection, makeRule } from './models.js'

const TEMPLATE_COLLECTION_ID = 'collection-template-api-scenarios'

function localize(t, key, fallback, vars = {}) {
  const value = typeof t === 'function' ? t(key, vars) : key
  return value && value !== key ? value : fallback.replaceAll(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ''))
}

function makeTemplateRule(seed) {
  return makeRule({
    collectionId: TEMPLATE_COLLECTION_ID,
    enabled: true,
    priority: seed.priority,
    name: seed.name,
    match: {
      matchType: 'contains',
      resourceType: 'Fetch',
      ...seed.match
    },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      statusText: 'OK',
      contentType: 'application/json',
      delayMs: 0,
      applyResponseBody: true,
      applyResponseHeaders: true,
      responseHeaders: 'X-InterceptPilot-Template: true',
      responseBody: '{\n  "ok": true\n}',
      ...seed.action
    }
  }, TEMPLATE_COLLECTION_ID)
}

export function buildCollectionTemplate(t) {
  const collection = makeCollection({
    id: TEMPLATE_COLLECTION_ID,
    name: localize(t, 'importTemplate.template.collectionName', 'API test scenarios'),
    description: localize(t, 'importTemplate.template.collectionDescription', 'Ready-to-edit examples for mock, failure and latency tests.'),
    enabled: true,
    order: 0
  })

  const rules = [
    makeTemplateRule({
      priority: 300,
      name: localize(t, 'importTemplate.template.mockRuleName', 'Mock user profile - success 200'),
      match: {
        urlPattern: '/api/user/profile',
        method: 'GET'
      },
      action: {
        type: 'mockResponse',
        statusCode: 200,
        statusText: 'OK',
        responseBody: JSON.stringify({
          id: 'usr_template_123',
          name: 'Template User',
          plan: 'Pro',
          ok: true
        }, null, 2)
      }
    }),
    makeTemplateRule({
      priority: 200,
      name: localize(t, 'importTemplate.template.failRuleName', 'Fail billing endpoint - network error'),
      match: {
        urlPattern: '/api/billing',
        method: 'POST'
      },
      action: {
        type: 'failRequest',
        delayMs: 0,
        failReason: 'Failed'
      }
    }),
    makeTemplateRule({
      priority: 100,
      name: localize(t, 'importTemplate.template.delayRuleName', 'Delay search results - 1200ms'),
      match: {
        urlPattern: '/api/search',
        method: 'GET'
      },
      action: {
        type: 'delayOnly',
        delayMs: 1200
      }
    })
  ]

  return createCollectionBundle(collection, rules)
}

export function buildRuleTemplate(t) {
  const rule = makeTemplateRule({
    priority: 100,
    name: localize(t, 'importTemplate.template.singleRuleName', 'Mock feature flag - success 200'),
    match: {
      urlPattern: '/api/feature-flags',
      method: 'GET'
    },
    action: {
      type: 'mockResponse',
      statusCode: 200,
      statusText: 'OK',
      responseBody: JSON.stringify({
        antiDownload: true,
        drmWatermark: false,
        ok: true
      }, null, 2)
    }
  })

  return createRuleBundle(rule)
}

export function getImportInstructions(t) {
  return localize(
    t,
    'importTemplate.instructions',
    'Copy the template JSON or download the file, edit endpoint patterns and response bodies, then import it from the Import screen.'
  )
}

export function getAiPrompt(t) {
  const collectionExample = JSON.stringify(buildCollectionTemplate(t), null, 2)
  const ruleExample = JSON.stringify(buildRuleTemplate(t), null, 2)
  return localize(t, 'importTemplate.aiPrompt', [
    'You will generate an importable InterceptPilot JSON bundle.',
    'The goal is to intercept application requests to test scenarios by simulating responses, failures, latency or pass-through behavior.',
    '',
    'Return ONLY valid JSON. Do not use Markdown. Do not add comments. Do not explain anything outside the JSON.',
    '',
    `There are two valid formats:`,
    '',
    `1. Collection bundle. Use when the scenario has multiple endpoints, multiple rules or a grouped test flow. It must use schemaVersion ${SCHEMA_VERSION} and type "${BUNDLE_TYPE_COLLECTION}".`,
    '',
    `2. Single rule bundle. Use when the scenario has one endpoint and one behavior. It must use schemaVersion ${SCHEMA_VERSION} and type "${BUNDLE_TYPE_RULE}".`,
    '',
    'Rule naming requirements:',
    '- Use clear names that make the test scenario obvious in the rules list.',
    '- Each rule name should mention the behavior, the resource or endpoint, and the expected result when useful.',
    '- Good examples: "Mock lives list - empty 200", "Fail live stream key - fetch error", "Delay user limit request - 1500ms".',
    '- Avoid generic names like "Rule 1", "Test", "Mock API" or "Endpoint".',
    '',
    'Allowed match.matchType values: "contains", "equals", "regex".',
    'Allowed match.method values: "ANY", "GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD".',
    'Allowed action.type values: "mockResponse", "failRequest", "delayOnly", "passThrough".',
    '',
    'For mockResponse, include statusCode, statusText, contentType and responseBody.',
    'For failRequest, include failReason when useful.',
    'For delayOnly, include delayMs.',
    '',
    'Collection bundle example:',
    collectionExample,
    '',
    'Single rule bundle example:',
    ruleExample,
    '',
    'Now generate the InterceptPilot JSON for this scenario:',
    '[Describe the app, endpoint(s), expected responses, errors or latency you want to test.]'
  ].join('\n'), {
    schemaVersion: SCHEMA_VERSION,
    collectionType: BUNDLE_TYPE_COLLECTION,
    ruleType: BUNDLE_TYPE_RULE,
    collectionExample,
    ruleExample
  })
}
