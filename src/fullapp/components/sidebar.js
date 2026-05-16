import { t } from '../../shared/i18n.js'

export function renderSidebar(currentPage) {
  const items = [
    ['dashboard', t('navigation.dashboard')],
    ['rules', t('navigation.rules')],
    ['collections', t('navigation.collections')],
    ['network', t('navigation.network')],
    ['logs', t('navigation.logs')],
    ['import-export', t('navigation.importExport')],
    ['diagnostics', t('navigation.diagnostics')],
    ['settings', t('navigation.settings')]
  ]

  return `
    <aside class="app-sidebar">
      <img class="brand-logo" src="../assets/brand/logo-horizontal.png" alt="MockPilot" />
      <nav>
        ${items.map(([id, label]) => `<button class="nav-item ${currentPage === id ? 'active' : ''}" data-page="${id}">${label}</button>`).join('')}
      </nav>
    </aside>
  `
}
