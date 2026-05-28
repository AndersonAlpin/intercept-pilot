export function parseImportBundle(raw, options = {}) {
  const {
    schemaVersion = 1,
    ruleType = 'interceptpilot.rule',
    collectionType = 'interceptpilot.collection'
  } = options

  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch {
    return { error: 'invalidJson' }
  }

  if (!parsed || parsed.schemaVersion !== schemaVersion) {
    return { error: 'unsupportedType' }
  }

  if (parsed.type !== ruleType && parsed.type !== collectionType) {
    return { error: 'unsupportedType' }
  }

  return { bundle: parsed }
}

export function findCollectionConflictById(bundle, collections = []) {
  const collectionId = bundle?.collection?.id
  if (!collectionId) return null
  return collections.find(collection => collection.id === collectionId) || null
}
