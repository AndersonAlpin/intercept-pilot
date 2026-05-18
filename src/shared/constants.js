export const STORAGE_KEYS = {
  collections: 'collections',
  rules: 'rules',
  settings: 'settings',
  logs: 'logs'
}

export const DEFAULT_COLLECTION_ID = 'collection-default'

export const DEFAULT_NETWORK_FILTER_FULL = {
  url: '',
  method: 'ANY',
  status: '',
  interceptedOnly: false
}

export const DEFAULT_NETWORK_FILTER_SIDE = {
  text: '',
  method: 'ANY',
  status: '',
  interceptedOnly: false
}

export const DEFAULT_SETTINGS = {
  activeCollectionId: DEFAULT_COLLECTION_ID,
  autoAttach: false,
  maxNetworkEntries: 300,
  maxLogs: 300,
  autoReloadAfterRuleChange: false,
  theme: 'dark',
  language: 'en',
  networkFilters: {
    fullApp: { ...DEFAULT_NETWORK_FILTER_FULL },
    sidepanel: { ...DEFAULT_NETWORK_FILTER_SIDE }
  }
}

export const METHODS = ['ANY', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
export const RESOURCE_TYPES = ['ANY', 'XHR', 'Fetch', 'Document', 'Script', 'Image', 'Stylesheet', 'Other']
export const MATCH_TYPES = ['contains', 'equals', 'regex', 'glob']
export const ACTION_TYPES = ['mockResponse', 'failRequest', 'delayOnly', 'passThrough']

export const FAIL_REASONS = [
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
