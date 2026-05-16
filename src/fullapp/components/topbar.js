import { escapeHtml, truncate } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'

function tabLabel(tab) {
  if (!tab) return ''
  const domain = (() => {
    try {
      return tab.url ? new URL(tab.url).host : ''
    } catch {
      return ''
    }
  })()
  const pos = tab.position ? t('status.tabPosition', { position: tab.position }) : ''
  return [pos, domain].filter(Boolean).join(' · ')
}

export function renderTopbar(state) {
  const attachedTab = state.attachedTab || null
  const currentTab = state.candidateTab || state.lastAttachableTab || null
  const attached = Boolean(state.attachedTabId && attachedTab)
  const attachedToCurrent = Boolean(attached && currentTab?.id && attachedTab?.id === currentTab.id)
  const showCurrentLine = Boolean(attached && currentTab && attachedTab?.id !== currentTab?.id)
  const primaryTab = attached ? attachedTab : currentTab
  const primaryTitle = primaryTab?.title || t('status.noAttachableTab')
  const primaryDetail = tabLabel(primaryTab)
  return `
    <header class="topbar">
      <div>
        <div class="status-row">
          <span class="dot ${attached ? 'ok' : 'off'}"></span>
          <strong>${attachedToCurrent ? t('status.attachedCurrent') : attached ? t('status.attachedOther') : t('status.notAttached')}</strong>
        </div>
        <div class="muted" title="${escapeHtml(primaryTab?.url || '')}">${escapeHtml(truncate(primaryTitle, 80))}</div>
        ${primaryDetail ? `<div class="muted">${escapeHtml(primaryDetail)}</div>` : ''}
        ${showCurrentLine ? `<div class="muted">${escapeHtml(`${t('status.currentTabLabel')}: ${truncate(currentTab.title || '', 48)}${tabLabel(currentTab) ? ` · ${tabLabel(currentTab)}` : ''}`)}</div>` : ''}
      </div>
      <div class="actions">
        <button class="btn" id="full-attach-btn">${attached ? t('common.reattach') : t('common.attach')}</button>
        <button class="btn" id="full-detach-btn" ${attached ? '' : 'disabled'}>${t('common.detach')}</button>
        <button class="btn" id="full-reload-btn" ${attached ? '' : 'disabled'}>${t('common.reload')}</button>
      </div>
    </header>
  `
}
