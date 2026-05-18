export const RULE_PRESETS = [
  {
    id: 'success-200',
    labelKey: 'presets.success200',
    icon: 'check-circle',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 200,
        statusText: 'OK',
        contentType: 'application/json',
        responseBody: '{\n  "ok": true\n}'
      }
    }
  },
  {
    id: 'unauthorized-401',
    labelKey: 'presets.unauthorized401',
    icon: 'lock',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 401,
        statusText: 'Unauthorized',
        contentType: 'application/json',
        responseBody: '{\n  "message": "Unauthorized"\n}'
      }
    }
  },
  {
    id: 'forbidden-403',
    labelKey: 'presets.forbidden403',
    icon: 'shield-off',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 403,
        statusText: 'Forbidden',
        contentType: 'application/json',
        responseBody: '{\n  "message": "Forbidden"\n}'
      }
    }
  },
  {
    id: 'rate-limited-429',
    labelKey: 'presets.rateLimited429',
    icon: 'gauge',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 429,
        statusText: 'Too Many Requests',
        contentType: 'application/json',
        responseBody: '{\n  "message": "Too many requests"\n}'
      }
    }
  },
  {
    id: 'server-error-500',
    labelKey: 'presets.serverError500',
    icon: 'alert-octagon',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 500,
        statusText: 'Internal Server Error',
        contentType: 'application/json',
        responseBody: '{\n  "message": "Internal server error"\n}'
      }
    }
  },
  {
    id: 'timeout',
    labelKey: 'presets.timeout',
    icon: 'timer',
    apply: { action: { type: 'delayOnly', delayMs: 30000 } }
  },
  {
    id: 'offline',
    labelKey: 'presets.offline',
    icon: 'wifi-off',
    apply: { action: { type: 'failRequest', failReason: 'InternetDisconnected' } }
  },
  {
    id: 'empty-list',
    labelKey: 'presets.emptyList',
    icon: 'list',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 200,
        statusText: 'OK',
        contentType: 'application/json',
        responseBody: '[]'
      }
    }
  },
  {
    id: 'empty-object',
    labelKey: 'presets.emptyObject',
    icon: 'braces',
    apply: {
      action: {
        type: 'mockResponse',
        statusCode: 200,
        statusText: 'OK',
        contentType: 'application/json',
        responseBody: '{}'
      }
    }
  }
]

export function getPresetById(id) {
  return RULE_PRESETS.find(p => p.id === id) || null
}

export function applyPresetToRule(rule, preset) {
  if (!rule || !preset) return rule
  return {
    ...rule,
    action: { ...(rule.action || {}), ...preset.apply.action }
  }
}
