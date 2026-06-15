import { t } from './i18n.js'

const RELEASE_NOTES = {
  '1.2.2': {
    itemKeys: [
      'releaseNotes.items.captureStatus',
      'releaseNotes.items.rulesOrganization',
      'releaseNotes.items.clickStability',
      'releaseNotes.items.importDrop',
      'releaseNotes.items.interfaceClarity',
      'releaseNotes.items.sidepanelRulesScroll'
    ]
  },
  '1.2.1': {
    itemKeys: [
      'releaseNotes.items.captureStatus',
      'releaseNotes.items.rulesOrganization',
      'releaseNotes.items.clickStability',
      'releaseNotes.items.importDrop',
      'releaseNotes.items.interfaceClarity'
    ]
  },
  '1.2.0': {
    itemKeys: [
      'releaseNotes.items.captureStatus',
      'releaseNotes.items.rulesOrganization',
      'releaseNotes.items.clickStability',
      'releaseNotes.items.importDrop',
      'releaseNotes.items.interfaceClarity'
    ]
  }
}

export const RELEASE_NOTES_VISIBLE_AFTER_SEEN_MS = 3 * 24 * 60 * 60 * 1000

export function hasReleaseNotesForVersion(version) {
  return Boolean(RELEASE_NOTES[String(version || '')])
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
  const notes = RELEASE_NOTES[resolvedVersion] || {}
  const items = (notes.itemKeys || []).map(key => t(key))

  return {
    version: resolvedVersion,
    title: t('releaseNotes.title'),
    items
  }
}
