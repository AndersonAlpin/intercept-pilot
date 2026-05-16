import { nowIso } from './utils.js'

export const SCHEMA_VERSION = 1
export const BUNDLE_TYPE_RULE = 'mockpilot.rule'
export const BUNDLE_TYPE_COLLECTION = 'mockpilot.collection'

export function createRuleBundle(rule) {
  return {
    schemaVersion: SCHEMA_VERSION,
    type: BUNDLE_TYPE_RULE,
    exportedAt: nowIso(),
    rule
  }
}

export function createCollectionBundle(collection, allRules) {
  const rules = (allRules || []).filter(rule => rule.collectionId === collection.id)
  return {
    schemaVersion: SCHEMA_VERSION,
    type: BUNDLE_TYPE_COLLECTION,
    exportedAt: nowIso(),
    collection,
    rules
  }
}

export async function copyJsonToClipboard(data) {
  const text = JSON.stringify(data, null, 2)
  await navigator.clipboard.writeText(text)
}

export function downloadJsonFile(data, filename) {
  const text = JSON.stringify(data, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function sanitizeFileName(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\s/?&:\\<>|"#%{}^~`+=*!@$,;]+/g, '-')
    .replace(/[^a-z0-9\-._]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
  return normalized || 'untitled'
}

export function getUniqueName(baseName, existingNames) {
  const set = new Set(existingNames || [])
  const base = String(baseName ?? '').trim() || 'Untitled'
  if (!set.has(base)) return base
  let n = 1
  while (set.has(`${base} (${n})`)) n += 1
  return `${base} (${n})`
}

export function buildRuleFilename(rule) {
  const name = sanitizeFileName(rule?.name || 'rule')
  return `mockpilot-rule-${name}.json`
}

export function buildCollectionFilename(collection) {
  const name = sanitizeFileName(collection?.name || 'collection')
  return `mockpilot-collection-${name}.json`
}
