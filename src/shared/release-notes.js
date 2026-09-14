import { t } from './i18n.js'

const RELEASE_NOTES = {
  // Example: bump `revision` when the items of an already shipped version
  // change, so the menu shows the notes again to people who had seen them.
  // '0.0.0': {
  //   revision: 1,
  //   itemKeys: [
  //     'releaseNotes.items.exampleItem'
  //   ]
  // },
  '1.3.0': {
    revision: 2,
    itemKeys: [
      'releaseNotes.items.aiBridgeIntro',
      'releaseNotes.items.aiBridgeContext',
      'releaseNotes.items.aiBridgeActions',
      'releaseNotes.items.aiBridgePermissions',
      'releaseNotes.items.aiBridgeCaptureControl'
    ]
  }
}

export const RELEASE_NOTES_VISIBLE_AFTER_SEEN_MS = 3 * 24 * 60 * 60 * 1000

export function hasReleaseNotesForVersion(version) {
  return Boolean(RELEASE_NOTES[String(version || '')])
}

// Identifies one edition of the notes: the same version seen before a content
// revision counts as unseen.
export function getReleaseNotesSeenKey(version) {
  const resolvedVersion = String(version || '').trim()
  const revision = Number(RELEASE_NOTES[resolvedVersion]?.revision) || 1
  return revision > 1 ? `${resolvedVersion}#${revision}` : resolvedVersion
}

export function getReleaseNotesMenuState({
  version,
  lastSeenVersion = '',
  lastSeenAt = 0,
  now = Date.now()
} = {}) {
  const resolvedVersion = String(version || '').trim()
  if (!resolvedVersion || !hasReleaseNotesForVersion(resolvedVersion)) {
    return { visible: false, unread: false }
  }

  const seen = String(lastSeenVersion || '') === getReleaseNotesSeenKey(resolvedVersion)
  if (!seen) return { visible: true, unread: true }

  const seenAt = Number(lastSeenAt) || 0
  if (!seenAt) return { visible: false, unread: false }

  return {
    visible: Number(now) - seenAt < RELEASE_NOTES_VISIBLE_AFTER_SEEN_MS,
    unread: false
  }
}

export function getReleaseNotesForVersion(version) {
  const resolvedVersion = String(version || '').trim()
  const notes = RELEASE_NOTES[resolvedVersion] || {}
  const items = (notes.itemKeys || []).map(key => t(key))

  return {
    version: resolvedVersion,
    title: t('releaseNotes.title'),
    items
  }
}
