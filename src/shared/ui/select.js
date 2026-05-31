import { escapeHtml } from '../utils.js'
import { icon } from '../icons.js'
import { joinClasses, renderAttrs, renderDataAttrs } from './dom.js'

function renderOption(option, selectedValue) {
  const value = String(option?.value ?? '')
  const label = option?.label ?? value
  const selected = String(selectedValue ?? '') === value
  const attrs = renderAttrs({
    value,
    selected,
    disabled: Boolean(option?.disabled)
  })
  return `<option ${attrs}>${escapeHtml(label)}</option>`
}

function normalizeOptions(options = [], placeholder) {
  const items = Array.isArray(options) ? [...options] : []
  if (placeholder != null) {
    items.unshift({ value: '', label: placeholder, disabled: true })
  }
  return items.map(option => {
    const value = String(option?.value ?? '')
    return {
      value,
      label: option?.label ?? value,
      description: option?.description || '',
      disabled: Boolean(option?.disabled)
    }
  })
}

function selectedOption(options, value) {
  const selectedValue = String(value ?? '')
  return options.find(option => option.value === selectedValue)
    || options.find(option => !option.disabled)
    || options[0]
    || { value: '', label: '' }
}

function renderSelectItem(option, selectedValue) {
  const selected = String(selectedValue ?? '') === option.value
  const attrs = renderAttrs({
    class: 'select-menu__item',
    type: 'button',
    role: 'option',
    'aria-selected': selected ? 'true' : 'false',
    disabled: option.disabled
  })
  const dataAttrs = renderDataAttrs({ 'select-option': option.value })
  const description = option.description
    ? `<span class="select-menu__item-description">${escapeHtml(option.description)}</span>`
    : ''
  return `<button ${joinClasses(attrs, dataAttrs)}><span class="select-menu__item-label">${escapeHtml(option.label)}</span>${description}</button>`
}

export function renderSelect({
  id,
  value,
  options = [],
  className,
  attrs,
  data,
  ariaLabel,
  placeholder,
  disabled
} = {}) {
  const optionItems = normalizeOptions(options, placeholder)
  const selected = selectedOption(optionItems, value)
  const nativeAttrs = {
    ...(attrs || {}),
    class: 'select-menu__native',
    value: undefined
  }
  if (id != null) nativeAttrs.id = id
  if (ariaLabel != null) nativeAttrs['aria-label'] = ariaLabel
  if (disabled) nativeAttrs.disabled = true

  const menuAttrs = renderAttrs({
    class: joinClasses('select-menu', className, disabled ? 'is-disabled' : ''),
    'data-select-menu': true
  })
  const buttonAttrs = renderAttrs({
    class: 'select select-menu__button',
    type: 'button',
    'data-select-button': true,
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': ariaLabel,
    disabled
  })
  const listAttrs = renderAttrs({
    class: 'select-menu__list',
    role: 'listbox'
  })
  const attributes = renderAttrs(nativeAttrs)
  const dataAttrs = renderDataAttrs(data)
  return `
    <div ${menuAttrs}>
      <select ${joinClasses(attributes, dataAttrs)}>${optionItems.map(option => renderOption(option, value)).join('')}</select>
      <button ${buttonAttrs}>
        <span class="select-menu__label">${escapeHtml(selected.label)}</span>
        <span class="select-menu__icon" aria-hidden="true">${icon('chevron-down', 14)}</span>
      </button>
      <div ${listAttrs}>${optionItems.map(option => renderSelectItem(option, value)).join('')}</div>
    </div>
  `
}

function closeSelectMenu(menu) {
  if (!menu) return
  menu.dataset.open = 'false'
  menu.querySelector('[data-select-button]')?.setAttribute('aria-expanded', 'false')
}

function closeOtherSelectMenus(activeMenu) {
  document.querySelectorAll('[data-select-menu][data-open="true"]').forEach(menu => {
    if (menu !== activeMenu) closeSelectMenu(menu)
  })
}

function syncSelectMenu(menu) {
  const select = menu.querySelector('select')
  const button = menu.querySelector('[data-select-button]')
  if (!select || !button) return
  const selected = select.selectedOptions?.[0] || select.options?.[select.selectedIndex]
  const label = selected?.textContent || ''
  const labelNode = button.querySelector('.select-menu__label')
  if (labelNode) labelNode.textContent = label
  menu.querySelectorAll('[data-select-option]').forEach(optionButton => {
    const selectedOption = optionButton.dataset.selectOption === select.value
    optionButton.setAttribute('aria-selected', selectedOption ? 'true' : 'false')
  })
}

function selectOption(optionButton) {
  const menu = optionButton.closest('[data-select-menu]')
  const select = menu?.querySelector('select')
  if (!menu || !select || optionButton.disabled) return
  const nextValue = optionButton.dataset.selectOption || ''
  const changed = select.value !== nextValue
  select.value = nextValue
  syncSelectMenu(menu)
  closeSelectMenu(menu)
  if (!changed) return
  select.dispatchEvent(new Event('input', { bubbles: true }))
  select.dispatchEvent(new Event('change', { bubbles: true }))
}

export function bindSelectMenus(root = document) {
  const scope = root instanceof Element || root === document ? root : document
  scope.querySelectorAll('[data-select-menu]').forEach(syncSelectMenu)

  if (document.documentElement.dataset.selectMenusBound === 'true') return
  document.documentElement.dataset.selectMenusBound = 'true'

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null
    const button = target?.closest('[data-select-button]')
    const optionButton = target?.closest('[data-select-option]')

    if (button) {
      const menu = button.closest('[data-select-menu]')
      if (!menu) return
      const open = menu.dataset.open === 'true'
      closeOtherSelectMenus(menu)
      menu.dataset.open = open ? 'false' : 'true'
      button.setAttribute('aria-expanded', open ? 'false' : 'true')
      return
    }

    if (optionButton) {
      selectOption(optionButton)
      return
    }

    closeOtherSelectMenus(null)
  })

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return
    closeOtherSelectMenus(null)
  })
}
