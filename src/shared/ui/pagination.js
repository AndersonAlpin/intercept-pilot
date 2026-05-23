import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderPagination({
  page = 1,
  totalItems = 0,
  pageSize = 1,
  compact = false,
  labels = {},
  dataAction,
  className,
  buttonClassName,
  labelClassName = 'network-page-label',
  countLabel,
  countClassName,
  countAttrs,
  controlsClassName,
  attrs
} = {}) {
  const safePageSize = Math.max(1, Number(pageSize || 1))
  const total = Math.max(0, Number(totalItems || 0))
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const currentPage = Math.min(Math.max(1, Number(page || 1)), totalPages)

  const resolvedCountAttrs = {
    ...(countAttrs || {})
  }
  const countClasses = joinClasses(countClassName, countAttrs?.class)
  if (countClasses) resolvedCountAttrs.class = countClasses
  const countHtml = countLabel != null
    ? `<span ${renderAttrs(resolvedCountAttrs)}>${escapeHtml(countLabel)}</span>`
    : ''

  if (totalPages <= 1) return countHtml

  const previousLabel = labels.previous ?? (compact ? '‹' : 'Previous')
  const nextLabel = labels.next ?? (compact ? '›' : 'Next')
  const previousContent = labels.previousHtml ?? escapeHtml(previousLabel)
  const nextContent = labels.nextHtml ?? escapeHtml(nextLabel)
  const previousTitle = labels.previousTitle ?? labels.previousAriaLabel ?? previousLabel
  const nextTitle = labels.nextTitle ?? labels.nextAriaLabel ?? nextLabel
  const pageLabel = labels.pageLabel ?? `${currentPage}/${totalPages}`
  const pageAriaLabel = labels.pageAriaLabel ?? pageLabel
  const dataPrev = dataAction ? renderDataAttrs({ [dataAction]: 'prev' }) : ''
  const dataNext = dataAction ? renderDataAttrs({ [dataAction]: 'next' }) : ''

  const previousAttrs = renderAttrs({
    class: joinClasses(buttonClassName || 'network-page-btn'),
    type: 'button',
    title: previousTitle,
    'aria-label': labels.previousAriaLabel ?? previousTitle,
    disabled: currentPage <= 1
  })
  const nextAttrs = renderAttrs({
    class: joinClasses(buttonClassName || 'network-page-btn'),
    type: 'button',
    title: nextTitle,
    'aria-label': labels.nextAriaLabel ?? nextTitle,
    disabled: currentPage >= totalPages
  })
  const containerAttrs = renderAttrs({
    ...(attrs || {}),
    class: joinClasses(controlsClassName || className || (compact ? 'network-pagination' : 'network-pagination-controls'), attrs?.class)
  })

  return `${countHtml}
    <div ${containerAttrs}>
      <button ${joinClasses(previousAttrs, dataPrev)}>${previousContent}</button>
      <span class="${escapeHtml(labelClassName)}" aria-label="${escapeHtml(pageAriaLabel)}">${escapeHtml(pageLabel)}</span>
      <button ${joinClasses(nextAttrs, dataNext)}>${nextContent}</button>
    </div>
  `
}
