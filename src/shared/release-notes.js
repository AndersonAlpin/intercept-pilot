import { t } from './i18n.js'

const RELEASE_NOTE_KEYS = {
  '1.2.0': [
    'releaseNotes.items.captureStatus',
    'releaseNotes.items.disabledActions',
    'releaseNotes.items.rulesLayout',
    'releaseNotes.items.solidToasts',
    'releaseNotes.items.dataTables',
    'releaseNotes.items.sidepanelScroll',
    'releaseNotes.items.importDrop',
    'releaseNotes.items.releaseNotesMenu'
  ]
}

export const RELEASE_NOTES_VISIBLE_AFTER_SEEN_MS = 3 * 24 * 60 * 60 * 1000

export function hasReleaseNotesForVersion(version) {
  return Array.isArray(RELEASE_NOTE_KEYS[String(version || '')])
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

  const seen = String(lastSeenVersion || '') === resolvedVersion
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
  const keys = RELEASE_NOTE_KEYS[resolvedVersion] || []
  return {
    version: resolvedVersion,
    title: t('releaseNotes.title'),
    items: keys.map(key => t(key))
  }
}
