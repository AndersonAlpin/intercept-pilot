export function renderAppShell({ sidebar, topbar, content, contentClass = '' }) {
  return `
    <div class="app-shell">
      ${sidebar}
      <div class="app-main">
        ${topbar}
        <main class="app-content ${contentClass}">${content}</main>
      </div>
    </div>
  `
}
