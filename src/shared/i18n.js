import en from './locales/en.js'
import pt from './locales/pt.js'
import es from './locales/es.js'

const LOCALES = { en, pt, es }
const DEFAULT_LOCALE = 'en'

let currentLocale = DEFAULT_LOCALE

function getByPath(obj, path) {
  return String(path || '').split('.').reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj)
}

export function setLocale(locale) {
  currentLocale = LOCALES[locale] ? locale : DEFAULT_LOCALE
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
