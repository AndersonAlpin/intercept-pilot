import { t } from '../../shared/i18n.js'

function displayCollectionName(collection) {
  if (collection?.id === 'collection-default') return t('collections.defaultName')
  return collection?.name || t('collections.defaultName')
}

export function renderDashboardPage(state) {
  const enabledRules = state.rules.filter(rule => rule.enabled).length
  const matchedRecently = state.rules.filter(rule => Number(rule.diagnostics?.matchCount || 0) > 0).length
  const errors = state.rules.filter(rule => rule.diagnostics?.lastError).length
  const activeCollection = state.collections.find(collection => collection.id === state.settings?.activeCollectionId)

  return `
    <section class="grid cards4">
      <article class="card"><h3>${t('dashboard.attached')}</h3><p>${state.attachedTabId ? t('common.yes') : t('common.no')}</p></article>
      <article class="card"><h3>${t('dashboard.enabledRules')}</h3><p>${enabledRules}</p></article>
      <article class="card"><h3>${t('dashboard.matchedRecently')}</h3><p>${matchedRecently}</p></article>
      <article class="card"><h3>${t('dashboard.errors')}</h3><p>${errors}</p></article>
    </section>
    <section class="card">
      <h3>${t('dashboard.currentContext')}</h3>
      <p>${t('dashboard.activeCollection')}: <strong>${displayCollectionName(activeCollection)}</strong></p>
      <p>${t('dashboard.recentNetwork')}: ${state.networkEntries.length}</p>
    </section>
  `
}
