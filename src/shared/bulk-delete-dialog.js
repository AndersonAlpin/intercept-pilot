import { t } from './i18n.js'

export function getBulkDeleteDialogCopy(scope, count = 0) {
  const namespace = scope === 'collections' ? 'collections' : 'rules'
  const suffix = Number(count) === 1 ? 'One' : 'Many'
  return {
    title: t(`${namespace}.deleteSelectedTitle${suffix}`, { count }),
    message: t(`${namespace}.deleteSelectedConfirm${suffix}`, { count }),
    confirmLabel: t('common.delete')
  }
}
