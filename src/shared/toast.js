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
  if (toast._timer) {
    clearTimeout(toast._timer)
    toast._timer = null
  }
  toast.classList.remove('show')
  setTimeout(() => toast.remove(), DISMISS_ANIM_MS)
}

function scheduleDismiss(toast) {
  if (toast._dismissed) return
  if (toast._timer) clearTimeout(toast._timer)
  if (toast._remaining <= 0) {
    dismiss(toast)
    return
  }
  toast._startedAt = Date.now()
  toast._timer = setTimeout(() => dismiss(toast), toast._remaining)
}

function pauseDismiss(toast) {
  if (toast._dismissed || !toast._timer) return
  clearTimeout(toast._timer)
  toast._timer = null
  const elapsed = Date.now() - toast._startedAt
  toast._remaining = Math.max(0, toast._remaining - elapsed)
}

export function showToast(message, type = 'info', duration = DEFAULT_DURATION) {
  const container = ensureContainer()
  const toast = document.createElement('div')
  toast.className = `toast toast-${type}`
  toast.innerHTML = `
    <span class="toast-msg">${escapeHtml(message)}</span>
    <button class="toast-close" type="button" aria-label="Close">${icon('close', 14)}</button>
  `
  toast._remaining = duration
  toast._startedAt = 0

  toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast))
  toast.addEventListener('mouseenter', () => pauseDismiss(toast))
  toast.addEventListener('mouseleave', () => scheduleDismiss(toast))
  toast.addEventListener('focusin', () => pauseDismiss(toast))
  toast.addEventListener('focusout', () => scheduleDismiss(toast))

  container.appendChild(toast)
  requestAnimationFrame(() => toast.classList.add('show'))
  scheduleDismiss(toast)
  return toast
}

export function toastSuccess(message, duration) {
  return showToast(message, 'success', duration ?? DEFAULT_DURATION)
}

export function toastError(message, duration) {
  return showToast(message, 'error', duration ?? DEFAULT_DURATION)
}

export function toastInfo(message, duration) {
  return showToast(message, 'info', duration ?? DEFAULT_DURATION)
}
