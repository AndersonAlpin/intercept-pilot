import { escapeHtml } from './utils.js'
import { icon } from './icons.js'

const DEFAULT_DURATION = 2500
const DISMISS_ANIM_MS = 200

function ensureContainer() {
  let container = document.querySelector('.toast-container')
  if (container) return container
  container = document.createElement('div')
  container.className = 'toast-container'
  container.setAttribute('role', 'status')
  container.setAttribute('aria-live', 'polite')
  document.body.appendChild(container)
  return container
}

function dismiss(toast) {
  if (toast._dismissed) return
  toast._dismissed = true
  if (toast._timer) clearTimeout(toast._timer)
  toast.classList.remove('show')
  setTimeout(() => toast.remove(), DISMISS_ANIM_MS)
}

export function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
  const container = ensureContainer()
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Close">${icon('close', 14)}</button>
  `
  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast))
  container.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  toast._timer = setTimeout(() => dismiss(toast), duration)
  return toast
}

export function toastSuccess(message) {
  return showToast(message, 'success')
}

export function toastError(message) {
  return showToast(message, 'error')
}

export function toastInfo(message) {
  return showToast(message, 'info')
}
