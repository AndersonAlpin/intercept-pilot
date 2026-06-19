import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { setLocale } from '../src/shared/i18n.js'
import { getReleaseNotesForVersion, getReleaseNotesMenuState, hasReleaseNotesForVersion } from '../src/shared/release-notes.js'
import { renderReleaseNotesModal } from '../src/fullapp/components/release-notes-modal.js'
import { renderSidebar } from '../src/fullapp/components/sidebar.js'

test('release notes registry is opt-in and empty by default', () => {
  setLocale('en')
  const notes = getReleaseNotesForVersion('1.2.4')

  assert.equal(notes.version, '1.2.4')
  assert.deepEqual(notes.items, [])
  assert.equal(hasReleaseNotesForVersion('1.2.4'), false)
  assert.equal(hasReleaseNotesForVersion('1.2.3'), false)
  assert.equal(hasReleaseNotesForVersion('0.0.0'), false)
})

test('release notes source keeps a commented example for future versions', () => {
  const source = readFileSync(new URL('../src/shared/release-notes.js', import.meta.url), 'utf8')

  assert.match(source, /Example:/)
  assert.match(source, /'0\.0\.0': \{/)
  assert.match(source, /releaseNotes\.items\.exampleItem/)
})

test('release notes menu stays hidden for 1.2.4 polish release', () => {
  assert.equal(hasReleaseNotesForVersion('1.2.4'), false)
  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.4',
    lastSeenVersion: '',
    lastSeenAt: 0,
    now: new Date('2026-06-18T12:00:00.000Z').getTime()
  }), { visible: false, unread: false })
})

test('release notes modal stays empty when the version has no notes', () => {
  setLocale('pt-BR')
  const html = renderReleaseNotesModal({ version: '1.2.4' })

  assert.equal(html, '')
})

test('release notes menu state stays hidden when a version has no notes', () => {
  const now = new Date('2026-06-13T12:00:00.000Z').getTime()
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.3',
    lastSeenVersion: '',
    lastSeenAt: 0,
    now
  }), { visible: false, unread: false })

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.3',
    lastSeenVersion: '1.2.3',
    lastSeenAt: twoDaysAgo,
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
