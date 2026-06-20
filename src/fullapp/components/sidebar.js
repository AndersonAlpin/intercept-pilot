import { t } from '../../shared/i18n.js'

function renderNavItem({ id, label, currentPage, unread = false }) {
  return `
    <button class="nav-item ${currentPage === id ? 'active' : ''}" data-page="${id}">
      <span class="nav-item__label">${label}</span>
      ${unread ? '<span class="nav-item__badge" aria-hidden="true"></span>' : ''}
    </button>
  `
}

export function renderSidebar(currentPage, options = {}) {
  const items = [
    ['dashboard', t('navigation.dashboard')],
    ['rules', t('navigation.rules')],
    ['collections', t('navigation.collections')],
    ['network', t('navigation.network')],
    ['logs', t('navigation.logs')],
    ['import-export', t('navigation.importExport')],
    ['diagnostics', t('navigation.diagnostics')],
    ['ai-bridge', t('navigation.aiBridge')],
    ['settings', t('navigation.settings')]
  ]
  const releaseNotes = options.releaseNotes || {}
  if (releaseNotes.visible) {
    items.push(['release-notes', t('navigation.releaseNotes'), Boolean(releaseNotes.unread)])
  }

  return `
    <aside class="app-sidebar">
      <img class="brand-logo" src="../assets/brand/logo-horizontal.png" alt="InterceptPilot" />
      <nav>
        ${items.map(([id, label, unread]) => renderNavItem({ id, label, currentPage, unread })).join('')}
      </nav>
    </aside>
  `
}
