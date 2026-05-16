import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

export function renderImportExportPage(state) {
  return `
    <section class="card">
      <h3>${t('navigation.importExport')}</h3>
      <p class="muted">${t('fullapp.importStrategy')}</p>
      <div class="footer-actions">
        <button class="btn" id="full-import-pick-file-btn">${t('fullapp.importPickFile')}</button>
        <input type="file" id="full-import-file-input" accept="application/json,.json" hidden />
      </div>
      <textarea class="textarea code" id="full-import-json" placeholder="${t('fullapp.importPlaceholder')}"></textarea>
      <div class="footer-actions">
        <button class="btn primary" id="full-import-json-btn">${t('fullapp.importJson')}</button>
      </div>
      ${state.lastImportExportMessage ? `<pre class="preview">${escapeHtml(state.lastImportExportMessage)}</pre>` : ''}
    </section>
  `
}
