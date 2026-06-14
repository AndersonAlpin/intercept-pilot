import { escapeHtml } from '../../shared/utils.js'
import { t } from '../../shared/i18n.js'
import { getReleaseNotesForVersion } from '../../shared/release-notes.js'
import { renderButton } from '../../shared/ui/button.js'
import { renderModalShell } from '../../shared/ui/modal-shell.js'

export function renderReleaseNotesModal({ version, manual = false } = {}) {
  const notes = getReleaseNotesForVersion(version)
  if (!notes.items.length) return ''

  const bodyHtml = `
    <div class="release-notes">
      <p class="muted">${escapeHtml(t('releaseNotes.version', { version: notes.version }))}</p>
      <ul class="release-notes-list">
        ${notes.items.map(item => `<li>${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>
  `

  return renderModalShell({
    title: notes.title,
    bodyHtml,
    footerHtml: renderButton({
      id: 'release-notes-close',
      label: t(manual ? 'common.close' : 'releaseNotes.markSeen'),
      variant: 'primary'
    }),
    closeId: 'release-notes-close-x',
    closeLabel: t('common.close'),
    className: 'release-notes-backdrop',
    dialogClassName: 'release-notes-modal',
    attrs: {
      'data-release-notes-modal': 'true'
    }
  })
}
