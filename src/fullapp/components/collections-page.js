import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderCollectionsPage(state) {
  const counts = new Map()
  for (const rule of state.rules) counts.set(rule.collectionId, (counts.get(rule.collectionId) || 0) + 1)

  return `
    <section class="card">
      <div class="toolbar">
        <button class="btn primary" id="full-new-collection-btn">${t('collections.newCollection')}</button>
      </div>
      <div class="list">
        ${state.collections.map(collection => `
          <div class="item">
            <div class="item-title">
              <div><strong>${escapeHtml(collection.name)}</strong><div class="item-meta">${counts.get(collection.id) || 0} ${t('collections.rulesCount')}</div></div>
              <label class="switch"><input type="checkbox" data-full-collection-enable="${collection.id}" ${collection.enabled ? 'checked' : ''}/> ${t('common.enabled')}</label>
            </div>
            <div class="footer-actions">
              <button class="btn" data-full-collection-set-active="${collection.id}">${t('collections.setActive')}</button>
              <button class="btn" data-full-collection-rename="${collection.id}">${t('collections.rename')}</button>
              ${collection.id === 'collection-default' ? '' : `<button class="btn danger" data-full-collection-delete="${collection.id}">${t('common.delete')}</button>`}
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `
}
