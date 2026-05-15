export function renderSidebar(currentPage) {
  const items = [
    ['dashboard', 'Dashboard'],
    ['rules', 'Rules'],
    ['collections', 'Collections'],
    ['network', 'Network'],
    ['logs', 'Logs'],
    ['import-export', 'Import / Export'],
    ['diagnostics', 'Diagnostics'],
    ['settings', 'Settings']
  ]

  return `
    <aside class="app-sidebar">
      <h1>MockPilot</h1>
      <nav>
        ${items.map(([id, label]) => `<button class="nav-item ${currentPage === id ? 'active' : ''}" data-page="${id}">${label}</button>`).join('')}
      </nav>
    </aside>
  `
}
