import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'

export function renderImportExportPage(state) {
  const bodyHtml = `
    <textarea class="textarea code import-json-input" id="full-import-json" placeholder="${t('fullapp.importPlaceholder')}"></textarea>
    ${state.lastImportExportMessage ? `<pre class="preview">${escapeHtml(state.lastImportExportMessage)}</pre>` : ''}
  `

  return `
    ${renderDataPanel({
      title: t('navigation.importExport'),
      description: t('fullapp.importStrategy'),
      actionsHtml: `
        <button class="btn secondary" id="full-import-pick-file-btn">${t('fullapp.importPickFile')}</button>
        <input type="file" id="full-import-file-input" accept="application/json,.json" hidden />
      `,
      bodyHtml,
      footerHtml: `<button class="btn primary" id="full-import-json-btn">${t('fullapp.importJson')}</button>`,
      className: 'import-export-panel',
      footerClassName: 'footer-actions'
    })}
  `
}
