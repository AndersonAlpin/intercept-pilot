import { escapeHtml } from './utils.js'
import { icon } from './icons.js'
import { t } from './i18n.js'

let activeDialog = null

function setBodyModalOpen() {
  document.body.classList.toggle('modal-open', Boolean(document.querySelector('.modal-backdrop')))
}

function closeDialog(result) {
  if (!activeDialog) return
  const { element, resolve, keydownHandler } = activeDialog
  document.removeEventListener('keydown', keydownHandler)
  element.remove()
  activeDialog = null
  setBodyModalOpen()
  resolve(result)
}

function openDialog({ title, bodyHtml, footerHtml, danger = false, onMount }) {
  if (activeDialog) closeDialog(null)
  const backdrop = document.createElement('div')
  backdrop.className = 'modal-backdrop dialog-backdrop'
  backdrop.setAttribute('data-modal-backdrop', '')
  backdrop.innerHTML = `
    <div class="modal dialog-modal ${danger ? 'dialog-modal-danger' : ''}" role="dialog" aria-modal="true">
      <div class="modal-header">
        <h3>${escapeHtml(title)}</h3>
        <button class="modal-close" type="button" data-dialog-cancel aria-label="${escapeHtml(t('common.close'))}">${icon('close', 16)}</button>
      </div>
      <div class="dialog-body">${bodyHtml}</div>
      <div class="footer-actions dialog-footer">${footerHtml}</div>
    </div>
  `
  document.body.appendChild(backdrop)

  return new Promise(resolve => {
    const keydownHandler = event => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeDialog(null)
      } else if (event.key === 'Enter' && event.target.tagName !== 'TEXTAREA') {
        const confirmBtn = backdrop.querySelector('[data-dialog-confirm]')
        if (confirmBtn) {
          event.preventDefault()
          confirmBtn.click()
        }
      }
    }
    document.addEventListener('keydown', keydownHandler)

    activeDialog = { element: backdrop, resolve, keydownHandler }
    setBodyModalOpen()

    backdrop.addEventListener('click', event => {
      if (event.target === backdrop) closeDialog(null)
    })
    backdrop.querySelectorAll('[data-dialog-cancel]').forEach(btn => {
      btn.addEventListener('click', () => closeDialog(null))
    })

    if (typeof onMount === 'function') onMount(backdrop)
  })
}

export function confirmDialog({ title, message, confirmLabel, cancelLabel, danger = false } = {}) {
  const resolvedConfirm = confirmLabel || t('common.confirm')
  const resolvedCancel = cancelLabel || t('common.cancel')
  const resolvedTitle = title || t('common.confirm')
  const bodyHtml = `<p class="dialog-message">${escapeHtml(message || '')}</p>`
  const footerHtml = `
    <button class="btn" type="button" data-dialog-cancel>${escapeHtml(resolvedCancel)}</button>
    <button class="btn ${danger ? 'danger' : 'primary'}" type="button" data-dialog-confirm>${escapeHtml(resolvedConfirm)}</button>
  `
  return openDialog({
    title: resolvedTitle,
    bodyHtml,
    footerHtml,
    danger,
    onMount(root) {
      root.querySelector('[data-dialog-confirm]').addEventListener('click', () => closeDialog(true))
      const focusTarget = root.querySelector('[data-dialog-confirm]')
      requestAnimationFrame(() => focusTarget?.focus())
    }
  })
}

export function promptDialog({ title, message, placeholder, defaultValue = '', confirmLabel, cancelLabel } = {}) {
  const resolvedConfirm = confirmLabel || t('common.save')
  const resolvedCancel = cancelLabel || t('common.cancel')
  const resolvedTitle = title || ''
  const bodyHtml = `
    ${message ? `<p class="dialog-message">${escapeHtml(message)}</p>` : ''}
    <input class="input" type="text" data-dialog-input placeholder="${escapeHtml(placeholder || '')}" value="${escapeHtml(defaultValue)}" />
  `
  const footerHtml = `
    <button class="btn" type="button" data-dialog-cancel>${escapeHtml(resolvedCancel)}</button>
    <button class="btn primary" type="button" data-dialog-confirm>${escapeHtml(resolvedConfirm)}</button>
  `
  return openDialog({
    title: resolvedTitle,
    bodyHtml,
    footerHtml,
    onMount(root) {
      const input = root.querySelector('[data-dialog-input]')
      root.querySelector('[data-dialog-confirm]').addEventListener('click', () => {
        const value = input?.value?.trim()
        if (!value) {
          input?.focus()
          return
        }
        closeDialog(value)
      })
      requestAnimationFrame(() => {
        input?.focus()
        input?.select()
      })
    }
  })
}
