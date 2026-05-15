import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderImportExportPage(state) {
  return `
    <section class="card">
      <h3>${t('navigation.importExport')}</h3>
      <div class="footer-actions">
        <button class="btn" id="full-export-current-collection">${t('fullapp.exportCurrentCollection')}</button>
        <button class="btn" id="full-export-all">${t('fullapp.exportAllData')}</button>
      </div>
      <textarea class="textarea code" id="full-import-json" placeholder="${t('fullapp.importPlaceholder')}"></textarea>
      <div class="footer-actions">
        <button class="btn primary" id="full-import-json-btn">${t('fullapp.importJson')}</button>
      </div>
      <div class="small">${t('fullapp.importStrategy')}</div>
      <pre class="preview">${escapeHtml(state.lastImportExportMessage || t('fullapp.noImportExportAction'))}</pre>
    </section>
  `
}
