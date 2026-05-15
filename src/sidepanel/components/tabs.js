import { t } from '../../shared/i18n.js'

export function renderTabs(currentTab) {
  const labels = {
    rules: t('navigation.rules'),
    network: t('navigation.network'),
    logs: t('navigation.logs')
  }
  return `
    <div class="tabs">
      ${['rules', 'network', 'logs'].map(tab => `
        <button class="tab ${currentTab === tab ? 'active' : ''}" data-tab="${tab}">${labels[tab]}</button>
      `).join('')}
    </div>
  `
}
