export function renderAppShell({ sidebar, topbar, content }) {
  return `
    <div class="app-shell">
      ${sidebar}
      <div class="app-main">
        ${topbar}
        <main class="app-content">${content}</main>
      </div>
    </div>
  `
}
