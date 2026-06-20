export const IMPORT_BUNDLE_SCHEMA_VERSION = 1
export const IMPORT_BUNDLE_TYPES = ['interceptpilot.rule', 'interceptpilot.collection']

export const IMPORT_BUNDLE_ALLOWED_VALUES = {
  matchType: ['contains', 'equals', 'regex', 'glob'],
  method: ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  resourceType: ['ANY', 'XHR', 'Fetch', 'Document', 'Script', 'Image', 'Stylesheet', 'Other'],
  actionType: ['mockResponse', 'failRequest', 'delayOnly', 'passThrough'],
  failReason: [
    'Failed',
    'Aborted',
    'TimedOut',
    'AccessDenied',
    'ConnectionClosed',
    'ConnectionRefused',
    'ConnectionReset',
    'InternetDisconnected',
    'NameNotResolved'
  ]
}

const baseMatchShape = {
  urlPattern: 'string',
  matchType: 'contains | equals | regex | glob',
  method: 'ANY | GET | POST | PUT | PATCH | DELETE | OPTIONS',
  resourceType: 'ANY | XHR | Fetch | Document | Script | Image | Stylesheet | Other'
}

const baseActionShape = {
  type: 'mockResponse | failRequest | delayOnly | passThrough',
  statusCode: 'number optional, 100-599 for mockResponse',
  statusText: 'string optional',
  contentType: 'string optional',
  responseBody: 'string optional; JSON responses must be stringified JSON',
  responseHeaders: 'string optional; for redirects include a Location header such as "Location: /new-path"',
  delayMs: 'number optional, milliseconds',
  failReason: 'Failed | Aborted | TimedOut | AccessDenied | ConnectionClosed | ConnectionRefused | ConnectionReset | InternetDisconnected | NameNotResolved'
}

export function getImportBundleSchema() {
  return {
    schemaVersion: IMPORT_BUNDLE_SCHEMA_VERSION,
    supportedTypes: [...IMPORT_BUNDLE_TYPES],
    ruleBundleShape: {
      schemaVersion: IMPORT_BUNDLE_SCHEMA_VERSION,
      type: 'interceptpilot.rule',
      exportedAt: 'ISO date string',
      rule: {
        id: 'string optional',
        collectionId: 'string optional',
        name: 'string',
        enabled: 'boolean',
        priority: 'number',
        match: { ...baseMatchShape },
        action: { ...baseActionShape }
      }
    },
    collectionBundleShape: {
      schemaVersion: IMPORT_BUNDLE_SCHEMA_VERSION,
      type: 'interceptpilot.collection',
      exportedAt: 'ISO date string',
      collection: {
        id: 'string optional',
        name: 'string',
        description: 'string optional',
        enabled: 'boolean',
        order: 'number optional'
      },
      rules: ['array of rule objects using the same rule shape as ruleBundleShape.rule']
    },
    allowedValues: {
      matchType: [...IMPORT_BUNDLE_ALLOWED_VALUES.matchType],
      method: [...IMPORT_BUNDLE_ALLOWED_VALUES.method],
      resourceType: [...IMPORT_BUNDLE_ALLOWED_VALUES.resourceType],
      actionType: [...IMPORT_BUNDLE_ALLOWED_VALUES.actionType],
      failReason: [...IMPORT_BUNDLE_ALLOWED_VALUES.failReason]
    },
    guidance: [
      'Prefer resourceType "ANY" unless the user explicitly asks for a specific type.',
      'Use matchType "contains" for most endpoint path matching unless the user needs exact, regex or glob matching.',
      'Use mockResponse for HTTP status codes from 100 to 599, including 4xx and 5xx.',
      'Use failRequest only for network-level failures where there is no HTTP response.',
      'Use delayOnly only to add latency without changing the response.',
      'Use passThrough to allow the request to continue unchanged.',
      'responseBody must be a string. If it contains JSON, stringify and escape it correctly.',
      'For redirects such as 301 or 302, use mockResponse and include a Location header when appropriate.',
      'Importing a bundle only creates a pending proposal; the user must confirm it in the Full App before anything is applied.'
    ]
  }
}

function createRuleBundle({ name, urlPattern, action, method = 'GET', priority = 100 }) {
  return {
    schemaVersion: IMPORT_BUNDLE_SCHEMA_VERSION,
    type: 'interceptpilot.rule',
    exportedAt: '2026-01-01T00:00:00.000Z',
    rule: {
      name,
      enabled: true,
      priority,
      match: {
        urlPattern,
        matchType: 'contains',
        method,
        resourceType: 'ANY'
      },
      action
    }
  }
}

export function getImportBundleExamples() {
  return [
    {
      name: 'Single rule mock 200',
      description: 'Example of a single rule bundle that mocks a JSON success response.',
      bundle: createRuleBundle({
        name: 'Mock example success',
        urlPattern: '/api/example',
        action: {
          type: 'mockResponse',
          statusCode: 200,
          statusText: 'OK',
          contentType: 'application/json',
          responseBody: '{"ok":true,"source":"interceptpilot"}'
        }
      })
    },
    {
      name: 'Single rule HTTP 500',
      description: 'Example of an HTTP error response. Use mockResponse for HTTP 4xx and 5xx statuses.',
      bundle: createRuleBundle({
        name: 'Mock checkout server error',
        urlPattern: '/api/checkout',
        action: {
          type: 'mockResponse',
          statusCode: 500,
          statusText: 'Internal Server Error',
          contentType: 'application/json',
          responseBody: '{"error":"temporary_failure"}'
        }
      })
    },
    {
      name: 'Single rule network timeout',
      description: 'Example of a network-level failure where no HTTP response should exist.',
      bundle: createRuleBundle({
        name: 'Simulate checkout timeout',
        urlPattern: '/api/checkout',
        action: {
          type: 'failRequest',
          failReason: 'TimedOut'
        }
      })
    },
    {
      name: 'Single rule delay only',
      description: 'Example of adding latency without changing the response.',
      bundle: createRuleBundle({
        name: 'Delay profile response',
        urlPattern: '/api/user/profile',
        action: {
          type: 'delayOnly',
          delayMs: 1200
        }
      })
    },
    {
      name: 'Collection with multiple rules',
      description: 'Example of a collection bundle grouping related checkout scenarios.',
      bundle: {
        schemaVersion: IMPORT_BUNDLE_SCHEMA_VERSION,
        type: 'interceptpilot.collection',
        exportedAt: '2026-01-01T00:00:00.000Z',
        collection: {
          name: 'Checkout examples',
          description: 'Safe generic checkout scenarios',
          enabled: true
        },
        rules: [
          {
            name: 'Checkout success',
            enabled: true,
            priority: 100,
            match: {
              urlPattern: '/api/checkout',
              matchType: 'contains',
              method: 'POST',
              resourceType: 'ANY'
            },
            action: {
              type: 'mockResponse',
              statusCode: 200,
              statusText: 'OK',
              contentType: 'application/json',
              responseBody: '{"ok":true,"orderId":"example-order"}'
            }
          },
          {
            name: 'Checkout unavailable',
            enabled: true,
            priority: 110,
            match: {
              urlPattern: '/api/checkout',
              matchType: 'contains',
              method: 'POST',
              resourceType: 'ANY'
            },
            action: {
              type: 'mockResponse',
              statusCode: 503,
              statusText: 'Service Unavailable',
              contentType: 'application/json',
              responseBody: '{"ok":false,"error":"service_unavailable"}'
            }
          }
        ]
      }
    }
  ]
}
