import { escapeHtml } from '../../shared/utils.js'

export function renderImportExportPage(state) {
  return `
    <section class="card">
      <h3>Import / Export</h3>
      <div class="footer-actions">
        <button class="btn" id="full-export-current-collection">Export current collection</button>
        <button class="btn" id="full-export-all">Export all data</button>
      </div>
      <textarea class="textarea code" id="full-import-json" placeholder="Paste JSON for import"></textarea>
      <div class="footer-actions">
        <button class="btn primary" id="full-import-json-btn">Import JSON</button>
      </div>
      <div class="small">Import strategy: merge by id (current MVP).</div>
      <pre class="preview">${escapeHtml(state.lastImportExportMessage || 'No export/import action yet.')}</pre>
    </section>
  `
}
