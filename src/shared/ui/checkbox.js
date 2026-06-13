import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderCheckbox({
  id,
  checked,
  disabled,
  ariaLabel,
  className,
  attrs,
  wrapperAttrs,
  data
} = {}) {
  const inputAttrs = {
    type: 'checkbox'
  }
  if (id != null) inputAttrs.id = id

  const dataAttrs = renderDataAttrs(data)
  if (checked) inputAttrs.checked = true
  if (disabled) inputAttrs.disabled = true
  if (ariaLabel != null) inputAttrs['aria-label'] = ariaLabel

  const inputHtml = `<input ${joinClasses(renderAttrs({ ...inputAttrs, ...(attrs || {}) }), dataAttrs)} />`
  const labelAttrs = renderAttrs({
    ...(wrapperAttrs || {}),
    class: joinClasses('ui-checkbox', className)
  })
  return `
    <label ${labelAttrs}>
      ${inputHtml}
      <span class="ui-checkbox__box" aria-hidden="true"></span>
    </label>
  `
}
