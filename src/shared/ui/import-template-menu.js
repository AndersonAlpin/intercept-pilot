import { t } from '../i18n.js'
import { renderDropdownMenu } from './dropdown-menu.js'

function templateItems(dataName) {
  return [
    ['copy-collection', t('importTemplate.copyCollectionTemplate')],
    ['copy-rule', t('importTemplate.copyRuleTemplate')],
    ['copy-ai-prompt', t('importTemplate.copyAiPrompt')],
    ['download-collection', t('importTemplate.downloadCollectionTemplate')],
    ['download-rule', t('importTemplate.downloadRuleTemplate')]
  ].map(([action, label]) => ({
    label,
    data: { [dataName]: action }
  }))
}

export function renderImportTemplateMenu({ id, dataName = 'template-action', className } = {}) {
  return renderDropdownMenu({
    id,
    label: t('importTemplate.templates'),
    className,
    items: templateItems(dataName)
  })
}
