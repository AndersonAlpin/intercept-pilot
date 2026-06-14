import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { setLocale } from '../src/shared/i18n.js'
import { getReleaseNotesForVersion, getReleaseNotesMenuState, hasReleaseNotesForVersion } from '../src/shared/release-notes.js'
import { renderReleaseNotesModal } from '../src/fullapp/components/release-notes-modal.js'
import { renderSidebar } from '../src/fullapp/components/sidebar.js'

test('release notes resolve localized entries for the current package version', () => {
  setLocale('en')
  const notes = getReleaseNotesForVersion('1.2.0')

  assert.equal(notes.version, '1.2.0')
  assert.ok(notes.items.length >= 1)
  assert.equal(hasReleaseNotesForVersion('1.2.0'), true)
  assert.equal(hasReleaseNotesForVersion('0.0.0'), false)
})

test('release notes modal renders a reopenable Full App notice', () => {
  setLocale('pt-BR')
  const html = renderReleaseNotesModal({ version: '1.2.0' })

  assert.match(html, /data-release-notes-modal="true"/)
  assert.match(html, /Novidades/)
  assert.match(html, /1\.2\.0/)
  assert.match(html, /id="release-notes-close"/)
})

test('release notes menu state follows unread and three-day seen window', () => {
  const now = new Date('2026-06-13T12:00:00.000Z').getTime()
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)
  const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000)

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.0',
    lastSeenVersion: '',
    lastSeenAt: 0,
    now
  }), { visible: true, unread: true })

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.0',
    lastSeenVersion: '1.2.0',
    lastSeenAt: twoDaysAgo,
    now
  }), { visible: true, unread: false })

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.0',
    lastSeenVersion: '1.2.0',
    lastSeenAt: fourDaysAgo,
    now
  }), { visible: false, unread: false })
})

test('sidebar renders release notes as a final menu item with unread badge', () => {
  setLocale('pt-BR')

  const html = renderSidebar('dashboard', {
    releaseNotes: { visible: true, unread: true }
  })

  assert.match(html, /data-page="release-notes"/)
  assert.match(html, />Atualizações</)
  assert.match(html, /class="[^"]*\bnav-item__badge\b/)
  assert.ok(html.lastIndexOf('data-page="release-notes"') > html.lastIndexOf('data-page="settings"'))
})

test('sidebar hides release notes menu item after the seen window', () => {
  const html = renderSidebar('dashboard', {
    releaseNotes: { visible: false, unread: false }
  })

  assert.doesNotMatch(html, /data-page="release-notes"/)
})

test('full app does not open release notes automatically on entry', () => {
  const source = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /function maybeShowReleaseNotes/)
  assert.doesNotMatch(source, /maybeShowReleaseNotes\(/)
  assert.doesNotMatch(source, /releaseNotesModal = \{ version, manual: false \}/)
})
