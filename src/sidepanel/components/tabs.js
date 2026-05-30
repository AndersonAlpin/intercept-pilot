import { t } from '../../shared/i18n.js'

export function renderTabs(currentTab) {
  const labels = {
    rules: t('navigation.rules'),
    network: t('navigation.network'),
    logs: t('navigation.logs')
  }
  const tabs = ['rules', 'network', 'logs'].map(tab => {
    const active = currentTab === tab
    return `<button class="tab ${active ? 'active' : ''}" type="button" role="tab" aria-selected="${active ? 'true' : 'false'}" data-tab="${tab}">${labels[tab]}</button>`
  }).join('')

  return `
    <div class="tabs" role="tablist" aria-label="${t('navigation.dashboard')}">
      ${tabs}
    </div>
  `
}
