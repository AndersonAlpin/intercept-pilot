import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

function renderCheckboxInput({ id, checked, inputClassName, attrs, data, disabled, ariaLabel } = {}) {
  const resolvedAttrs = {
    ...(attrs || {}),
    id,
    type: 'checkbox',
    checked: Boolean(checked),
    disabled: Boolean(disabled),
    'aria-label': ariaLabel
  }
  const inputClasses = joinClasses(inputClassName, attrs?.class)
  if (inputClasses) resolvedAttrs.class = inputClasses

  const inputAttrs = renderAttrs(resolvedAttrs)
  const dataAttrs = renderDataAttrs(data)
  return `<input ${joinClasses(inputAttrs, dataAttrs)} />`
}

export function renderSwitch({
  id,
  checked,
  label,
  className,
  inputClassName,
  attrs,
  data,
  disabled,
  ariaLabel
} = {}) {
  const labelAttrs = renderAttrs({
    class: joinClasses('switch', className),
    for: id || null
  })
  const inputHtml = renderCheckboxInput({ id, checked, inputClassName, attrs, data, disabled, ariaLabel })
  return `<label ${labelAttrs}>${inputHtml}<span class="switch-track" aria-hidden="true"></span>${label != null ? `<span class="switch-label">${escapeHtml(label)}</span>` : ''}</label>`
}

export function renderStatusToggle({
  id,
  checked,
  className,
  inputClassName,
  attrs,
  data,
  disabled,
  ariaLabel,
  title
} = {}) {
  const labelAttrs = renderAttrs({
    class: joinClasses('status-toggle', className),
    title
  })
  const inputHtml = renderCheckboxInput({ id, checked, inputClassName, attrs, data, disabled, ariaLabel })
  return `<label ${labelAttrs}>${inputHtml}<span class="status-toggle-track" aria-hidden="true"></span></label>`
}
