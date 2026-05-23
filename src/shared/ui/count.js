import { t } from '../i18n.js'

function entityLabel(total, singular, plural) {
  return Number(total) === 1 ? singular : plural
}

export function formatShowingCount({ shown, total, singular, plural } = {}) {
  return t('common.showingCount', {
    shown: Number(shown || 0),
    total: Number(total || 0),
    entity: entityLabel(total, singular, plural)
  })
}

export function formatShowingRange({ start, end, total, singular, plural } = {}) {
  return t('common.showingRange', {
    start: Number(start || 0),
    end: Number(end || 0),
    total: Number(total || 0),
    entity: entityLabel(total, singular, plural)
  })
}
