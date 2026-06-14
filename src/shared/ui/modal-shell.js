import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
import { joinClasses, renderAttrs } from './dom.js'

const TITLE_TAGS = new Set(['h2', 'h3', 'h4'])

export function renderModalShell({
  title,
  bodyHtml = '',
  footerHtml = '',
  className,
  dialogClassName,
  headerClassName,
  bodyClassName,
  footerClassName,
  closeId,
  closeLabel,
  closeHtml = icon('close', 16),
  closeAttrs,
  titleTag = 'h3',
  attrs,
  dialogAttrs,
  bodyAttrs,
  footerAttrs,
  showClose = true
} = {}) {
  const resolvedTitleTag = TITLE_TAGS.has(titleTag) ? titleTag : 'h3'
  const resolvedDialogAttrs = {
    role: 'dialog',
    'aria-modal': 'true',
    ...dialogAttrs
  }
  if (title && !resolvedDialogAttrs['aria-label'] && !resolvedDialogAttrs['aria-labelledby']) {
    resolvedDialogAttrs['aria-label'] = title
  }

  const resolvedCloseAttrs = {
    type: 'button',
    class: 'modal-close',
    ...closeAttrs
  }
  if (closeId) resolvedCloseAttrs.id = closeId
  if (closeLabel && !resolvedCloseAttrs['aria-label']) resolvedCloseAttrs['aria-label'] = closeLabel
  if (closeLabel && !resolvedCloseAttrs.title) resolvedCloseAttrs.title = closeLabel

  const backdropAttrs = {
    'data-modal-backdrop': true,
    ...attrs,
    class: joinClasses('modal-backdrop', className, attrs?.class)
  }
  const dialogAttrsWithClass = {
    ...resolvedDialogAttrs,
    class: joinClasses('modal', 'modal-shell', dialogClassName, resolvedDialogAttrs.class)
  }
  const headerAttrs = {
    class: joinClasses('modal-header', 'modal-shell-header', headerClassName)
  }
  const bodyAttrsWithClass = {
    ...bodyAttrs,
    class: joinClasses('modal-body', 'modal-shell-body', bodyClassName, bodyAttrs?.class)
  }
  const footerAttrsWithClass = {
    ...footerAttrs,
    class: joinClasses('modal-footer', 'modal-shell-footer', footerClassName, footerAttrs?.class)
  }

  return `
    <div ${renderAttrs(backdropAttrs)}>
      <div ${renderAttrs(dialogAttrsWithClass)}>
        <div ${renderAttrs(headerAttrs)}>
          <${resolvedTitleTag}>${escapeHtml(title || '')}</${resolvedTitleTag}>
          ${showClose ? `<button ${renderAttrs(resolvedCloseAttrs)}>${closeHtml}</button>` : ''}
        </div>
        <div ${renderAttrs(bodyAttrsWithClass)}>${bodyHtml}</div>
        ${footerHtml ? `<div ${renderAttrs(footerAttrsWithClass)}>${footerHtml}</div>` : ''}
      </div>
    </div>
  `
}
