import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { icon } from '../../shared/icons.js'

function actionLabel(rule) {
  const type = rule.action?.type || 'mockResponse'
  if (type === 'mockResponse') return `mock ${rule.action?.statusCode || 200}`
  if (type === 'failRequest') return 'fail'
  if (type === 'delayOnly') return `delay ${rule.action?.delayMs || 0}ms`
  return 'pass'
}

function iconBtn({ icon: iconName, label, action, ruleId, danger = false }) {
  const cls = `icon-btn${danger ? ' danger' : ''}`
  return `<button class="${cls}" type="button" data-full-rule-${action}="${ruleId}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${icon(iconName)}</button>`
}

export function renderRulesPage(state) {
  const activeCollectionId = state.settings?.activeCollectionId
  const rules = state.rules.filter(rule => !activeCollectionId || rule.collectionId === activeCollectionId)
  const options = state.collections.map(collection => `<option value="${collection.id}" ${collection.id === activeCollectionId ? 'selected' : ''}>${escapeHtml(collection.name)}</option>`).join('')

  return `
    <section class="card">
      <div class="toolbar">
        <select class="select" id="full-rules-collection">${options}</select>
        <input class="input" id="full-rules-search" placeholder="${t('rules.searchPlaceholder')}" value="${escapeHtml(state.rulesSearch || '')}" />
        <button class="btn primary" id="full-new-rule-btn">${t('fullapp.newRule')}</button>
        <button class="btn" id="full-import-rule-btn">${t('common.import')}</button>
      </div>
      <div class="table table-wide">
        ${rules.length ? rules.map(rule => `
          <div class="table-row row-rule ${rule.diagnostics?.lastError ? 'row-error' : ''}">
            <div><label class="switch"><input type="checkbox" data-full-rule-toggle="${rule.id}" ${rule.enabled ? 'checked' : ''}/> ${t('common.enabled')}</label></div>
            <div>${rule.priority}</div>
            <div>${escapeHtml(rule.match?.method || 'ANY')}</div>
            <div title="${escapeHtml(rule.match?.urlPattern || '')}">${escapeHtml(rule.name)}</div>
            <div>${escapeHtml(actionLabel(rule))}</div>
            <div>${rule.diagnostics?.conflictIds?.length ? '<span class="badge warning">conflict</span>' : '<span class="badge success">ok</span>'}</div>
            <div class="row-actions">
              ${iconBtn({ icon: 'edit', label: t('common.edit'), action: 'edit', ruleId: rule.id })}
              ${iconBtn({ icon: 'copy', label: t('common.copyJson'), action: 'copy', ruleId: rule.id })}
              ${iconBtn({ icon: 'download', label: t('common.exportJson'), action: 'export', ruleId: rule.id })}
              ${iconBtn({ icon: 'trash', label: t('common.delete'), action: 'delete', ruleId: rule.id, danger: true })}
            </div>
          </div>
        `).join('') : `<div class="empty">${t('rules.noRules')}</div>`}
      </div>
    </section>
  `
}
