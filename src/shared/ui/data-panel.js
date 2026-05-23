import { escapeHtml } from '../utils.js'
import { joinClasses, renderAttrs } from './dom.js'

export function renderDataPanel({
  title,
  description,
  actionsHtml = '',
  filtersHtml = '',
  bodyHtml = '',
  footerHtml = '',
  className,
  headerClassName,
  filtersClassName,
  bodyClassName,
  scrollClassName,
  footerClassName,
  attrs,
  headerAttrs,
  filtersAttrs,
  bodyAttrs,
  scrollAttrs,
  footerAttrs
} = {}) {
  const panelAttrs = {
    ...(attrs || {}),
    class: joinClasses('data-panel', className, attrs?.class)
  }
  const header = title || description || actionsHtml
    ? `
      <header ${renderAttrs({ ...(headerAttrs || {}), class: joinClasses('data-panel__header', headerClassName, headerAttrs?.class) })}>
        <div class="data-panel__title-group">
          ${title ? `<h3 class="data-panel__title">${escapeHtml(title)}</h3>` : ''}
          ${description ? `<p class="data-panel__description">${escapeHtml(description)}</p>` : ''}
        </div>
        ${actionsHtml ? `<div class="data-panel__actions">${actionsHtml}</div>` : ''}
      </header>
    `
    : ''
  const filters = filtersHtml
    ? `<div ${renderAttrs({ ...(filtersAttrs || {}), class: joinClasses('data-panel__filters', filtersClassName, filtersAttrs?.class) })}>${filtersHtml}</div>`
    : ''
  const footer = footerHtml
    ? `<footer ${renderAttrs({ ...(footerAttrs || {}), class: joinClasses('data-panel__footer', footerClassName, footerAttrs?.class) })}>${footerHtml}</footer>`
    : ''

  return `
    <section ${renderAttrs(panelAttrs)}>
      ${header}
      ${filters}
      <div ${renderAttrs({ ...(bodyAttrs || {}), class: joinClasses('data-panel__body', bodyClassName, bodyAttrs?.class) })}>
        <div ${renderAttrs({ ...(scrollAttrs || {}), class: joinClasses('data-panel__scroll', scrollClassName, scrollAttrs?.class) })}>${bodyHtml}</div>
      </div>
      ${footer}
    </section>
  `
}
