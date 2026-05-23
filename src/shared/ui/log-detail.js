import { escapeHtml } from '../utils.js'
import { t } from '../i18n.js'
import { renderButton } from './button.js'
import { renderModalShell } from './modal-shell.js'

function prettyLog(log) {
  try {
    return JSON.stringify(log || {}, null, 2)
  } catch {
    return String(log || '')
  }
}

function renderDetailRow(label, value, className = '') {
  if (value == null || value === '') return ''
  return `
    <div class="log-detail-row ${className}">
      <span>${escapeHtml(label)}</span>
      <div>${escapeHtml(value)}</div>
    </div>
  `
}

export function renderLogDetailModal({ log, prefix = 'log', className = '', dialogClassName = '' } = {}) {
  if (!log) return ''

  const logJson = prettyLog(log)
  const hasUrl = Boolean(log.url)
  const bodyHtml = `
    <div class="log-detail">
      <div class="log-detail-grid">
        ${renderDetailRow(t('common.level'), t(`logs.levels.${log.level === 'error' || log.level === 'warn' ? log.level : 'info'}`))}
        ${renderDetailRow(t('logs.columns.time'), log.timestamp || '')}
      </div>
      ${renderDetailRow(t('logs.columns.message'), log.message || '', 'log-detail-row-wide')}
      ${renderDetailRow(t('logs.columns.url'), log.url || '', 'log-detail-row-wide')}
      <div class="log-detail-row log-detail-row-wide">
        <span>${escapeHtml(t('logs.rawLog'))}</span>
        <pre>${escapeHtml(logJson)}</pre>
      </div>
    </div>
  `
  const footerHtml = `
    ${renderButton({ label: t('logs.copyMessage'), variant: 'secondary', data: { [`${prefix}-log-copy`]: 'message' }, disabled: !log.message })}
    ${renderButton({ label: t('logs.copyUrl'), variant: 'secondary', data: { [`${prefix}-log-copy`]: 'url' }, disabled: !hasUrl })}
    ${renderButton({ label: t('logs.copyLog'), variant: 'secondary', data: { [`${prefix}-log-copy`]: 'json' } })}
    ${renderButton({ id: `${prefix}-log-detail-close`, label: t('common.close') })}
  `

  return renderModalShell({
    title: t('logs.detailsTitle'),
    bodyHtml,
    footerHtml,
    closeId: `${prefix}-log-detail-close-x`,
    closeLabel: t('common.close'),
    className: `log-detail-backdrop ${className}`,
    dialogClassName: `log-detail-modal ${dialogClassName}`,
    footerClassName: 'footer-actions log-detail-footer',
    attrs: { 'data-log-detail-backdrop': prefix }
  })
}
