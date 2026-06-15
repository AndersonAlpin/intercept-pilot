import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { setLocale } from '../src/shared/i18n.js'
import { getReleaseNotesForVersion, getReleaseNotesMenuState, hasReleaseNotesForVersion } from '../src/shared/release-notes.js'
import { renderReleaseNotesModal } from '../src/fullapp/components/release-notes-modal.js'
import { renderSidebar } from '../src/fullapp/components/sidebar.js'

test('release notes resolve localized entries for the current package version', () => {
  setLocale('en')
  const notes = getReleaseNotesForVersion('1.2.2')

  assert.equal(notes.version, '1.2.2')
  assert.ok(notes.items.length >= 1)
  assert.equal(hasReleaseNotesForVersion('1.2.2'), true)
  assert.equal(hasReleaseNotesForVersion('1.2.1'), true)
  assert.equal(hasReleaseNotesForVersion('1.2.0'), true)
  assert.equal(hasReleaseNotesForVersion('0.0.0'), false)
})

test('release notes 1.2.2 keep the previous consolidated copy and add the sidepanel fix', () => {
  const expected = {
    'pt-BR': [
      'Captura mais consistente entre Full App e Sidepanel.',
      'Regras ficaram mais fáceis de organizar, com mais espaço para nomes/URLs e opção de mover regras selecionadas para outra coleção.',
      'Rede e Logs ficaram mais estáveis durante atualizações em tempo real.',
      'Importar agora aceita soltar arquivos JSON no editor, mantendo colagem manual e seleção por arquivo.',
      'A interface ficou mais clara e legível, com ações indisponíveis explicando o motivo e toasts mais sólidos.',
      'Corrigido no Sidepanel: a lista de regras agora preserva a posição e os menus do cabeçalho abrem fora do card.'
    ],
    en: [
      'Capture status is more consistent between Full App and Sidepanel.',
      'Rules are easier to organize, with more room for names/URLs and the option to move selected rules to another collection.',
      'Network and Logs are more stable during real-time updates.',
      'Import now accepts dropping JSON files into the editor while preserving manual paste and file selection.',
      'The interface is clearer and easier to read, with unavailable actions explaining why and more solid toasts.',
      'Fixed in the Sidepanel: the rules list now preserves its position and header menus open outside the card.'
    ],
    es: [
      'El estado de captura es más consistente entre Full App y Sidepanel.',
      'Las reglas son más fáciles de organizar, con más espacio para nombres/URLs y la opción de mover reglas seleccionadas a otra colección.',
      'Red y Logs son más estables durante actualizaciones en tiempo real.',
      'Importar ahora permite soltar archivos JSON en el editor, manteniendo el pegado manual y la selección por archivo.',
      'La interfaz es más clara y fácil de leer, con acciones no disponibles que explican el motivo y toasts más sólidos.',
      'Corregido en el Sidepanel: la lista de reglas ahora conserva la posición y los menús del encabezado se abren fuera de la tarjeta.'
    ]
  }

  for (const [locale, items] of Object.entries(expected)) {
    setLocale(locale)
    const notes = getReleaseNotesForVersion('1.2.2')
    assert.deepEqual(notes.items, items)
  }
})

test('release notes 1.2.0 use final localized publication copy', () => {
  const expected = {
    'pt-BR': {
      title: 'Novidades',
      items: [
        'Captura mais consistente entre Full App e Sidepanel.',
        'Regras ficaram mais fáceis de organizar, com mais espaço para nomes/URLs e opção de mover regras selecionadas para outra coleção.',
        'Rede e Logs ficaram mais estáveis durante atualizações em tempo real.',
        'Importar agora aceita soltar arquivos JSON no editor, mantendo colagem manual e seleção por arquivo.',
        'A interface ficou mais clara e legível, com ações indisponíveis explicando o motivo e toasts mais sólidos.'
      ]
    },
    en: {
      title: 'What’s new',
      items: [
        'Capture status is more consistent between Full App and Sidepanel.',
        'Rules are easier to organize, with more room for names/URLs and the option to move selected rules to another collection.',
        'Network and Logs are more stable during real-time updates.',
        'Import now accepts dropping JSON files into the editor while preserving manual paste and file selection.',
        'The interface is clearer and easier to read, with unavailable actions explaining why and more solid toasts.'
      ]
    },
    es: {
      title: 'Novedades',
      items: [
        'El estado de captura es más consistente entre Full App y Sidepanel.',
        'Las reglas son más fáciles de organizar, con más espacio para nombres/URLs y la opción de mover reglas seleccionadas a otra colección.',
        'Red y Logs son más estables durante actualizaciones en tiempo real.',
        'Importar ahora permite soltar archivos JSON en el editor, manteniendo el pegado manual y la selección por archivo.',
        'La interfaz es más clara y fácil de leer, con acciones no disponibles que explican el motivo y toasts más sólidos.'
      ]
    }
  }

  for (const [locale, copy] of Object.entries(expected)) {
    setLocale(locale)
    const notes = getReleaseNotesForVersion('1.2.0')
    assert.equal(notes.title, copy.title)
    assert.deepEqual(notes.items, copy.items)
  }
})

test('release notes modal renders a reopenable Full App notice', () => {
  setLocale('pt-BR')
  const html = renderReleaseNotesModal({ version: '1.2.2' })

  assert.match(html, /data-release-notes-modal="true"/)
  assert.match(html, /Novidades/)
  assert.match(html, /1\.2\.2/)
  assert.doesNotMatch(html, /Novidades recentes/)
  assert.doesNotMatch(html, /Correções desta versão/)
  assert.match(html, /id="release-notes-close"/)
})

test('release notes menu state follows unread and three-day seen window', () => {
  const now = new Date('2026-06-13T12:00:00.000Z').getTime()
  const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)
  const fourDaysAgo = now - (4 * 24 * 60 * 60 * 1000)

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.2',
    lastSeenVersion: '',
    lastSeenAt: 0,
    now
  }), { visible: true, unread: true })

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.2',
    lastSeenVersion: '1.2.2',
    lastSeenAt: twoDaysAgo,
    now
  }), { visible: true, unread: false })

  assert.deepEqual(getReleaseNotesMenuState({
    version: '1.2.2',
    lastSeenVersion: '1.2.2',
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
