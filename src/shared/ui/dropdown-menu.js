import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

export function renderDropdownMenu({
  id,
  label,
  items = [],
  className,
  buttonClassName,
  listClassName
} = {}) {
  const detailsAttrs = renderAttrs({
    id,
    class: joinClasses('dropdown-menu', className)
  })
  const summaryAttrs = renderAttrs({
    class: joinClasses('btn secondary dropdown-menu__button', buttonClassName)
  })
  const listAttrs = renderAttrs({
    class: joinClasses('dropdown-menu__list', listClassName)
  })
  const itemHtml = items.map(item => {
    const itemAttrs = renderAttrs({
      class: joinClasses('dropdown-menu__item', item.className),
      type: 'button',
      disabled: Boolean(item.disabled)
    })
    const dataAttrs = renderDataAttrs(item.data)
    return `<button ${joinClasses(itemAttrs, dataAttrs)}>${escapeHtml(item.label || '')}</button>`
  }).join('')

  return `
    <details ${detailsAttrs}>
      <summary ${summaryAttrs}>
        <span class="btn__label">${escapeHtml(label || '')}</span>
        <span class="btn__icon">${icon('chevron-down', 14)}</span>
      </summary>
      <div ${listAttrs}>${itemHtml}</div>
    </details>
  `
}
