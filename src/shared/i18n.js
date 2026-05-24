import en from './locales/en.js'
import ptBR from './locales/pt-BR.js'
import es from './locales/es.js'

const LOCALES = { en, 'pt-BR': ptBR, es }
const DEFAULT_LOCALE = 'en'

let currentLocale = resolveLocale()

export function normalizeLocale(locale) {
  const value = String(locale || '').trim().toLowerCase()
  if (!value) return ''
  if (value === 'pt' || value === 'pt-br' || value === 'pt-pt' || value.startsWith('pt-')) return 'pt-BR'
  if (value === 'en' || value.startsWith('en-')) return 'en'
  if (value === 'es' || value.startsWith('es-')) return 'es'
  return ''
}

export function getBrowserLocale() {
  const navigatorLocale = globalThis.navigator || {}
  const browserLocale = navigatorLocale.languages?.[0] || navigatorLocale.language || ''
  return normalizeLocale(browserLocale) || DEFAULT_LOCALE
}

export function resolveLocale(locale) {
  return normalizeLocale(locale) || getBrowserLocale()
}

function getByPath(obj, path) {
  return String(path || '').split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj)
}

export function setLocale(locale) {
  const resolvedLocale = resolveLocale(locale)
  currentLocale = LOCALES[resolvedLocale] ? resolvedLocale : DEFAULT_LOCALE
  return currentLocale
}

export function getLocale() {
  return currentLocale
}

export function getAvailableLocales() {
  return Object.keys(LOCALES)
}

export function t(key, vars = {}) {
  const primary = getByPath(LOCALES[currentLocale], key)
  const fallback = getByPath(LOCALES[DEFAULT_LOCALE], key)
  let value = primary ?? fallback ?? key

  if (typeof value !== 'string') return String(value)
  for (const [name, varValue] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(varValue))
  }
  return value
}

export { DEFAULT_LOCALE }
