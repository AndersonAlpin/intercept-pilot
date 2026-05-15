export function renderTabs(currentTab) {
  return `
    <div class="tabs">
      ${['rules', 'network', 'logs'].map(tab => `
        <button class="tab ${currentTab === tab ? 'active' : ''}" data-tab="${tab}">${tab[0].toUpperCase() + tab.slice(1)}</button>
      `).join('')}
    </div>
  `
}
