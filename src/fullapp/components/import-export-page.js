import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderDataPanel } from '../../shared/ui/data-panel.js'
import { renderImportTemplateMenu } from '../../shared/ui/import-template-menu.js'

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
        ${renderImportTemplateMenu({ id: 'full-import-templates-menu', dataName: 'import-template-action' })}
        ${renderButton({ id: 'full-import-pick-file-btn', label: t('fullapp.importPickFile'), variant: 'secondary', iconName: 'upload', iconPosition: 'start' })}
        <input type="file" id="full-import-file-input" accept="application/json,.json" hidden />
      `,
      bodyHtml,
      footerHtml: renderButton({
        id: 'full-import-json-btn',
        label: t('fullapp.importJson'),
        variant: 'primary',
        disabled: true,
        tooltip: t('fullapp.importJsonDisabled')
      }),
      className: 'import-export-panel',
      footerClassName: 'footer-actions'
    })}
  `
}
