import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { renderAiBridgePage } from '../src/fullapp/components/ai-bridge-page.js'

const connectedState = {
  aiBridgeSession: {
    status: 'connected',
    token: 'secret-token',
    port: 37177,
    startedAt: '2026-06-20T10:00:00.000Z',
    connectedAt: '2026-06-20T10:01:00.000Z',
    permissions: {
      allowQueryValuesThisSession: true,
      allowRuleActionsThisSession: false
    }
  },
  settings: {
    aiBridgePermissions: {
      allowQueryValuesByDefault: false,
      allowRuleActionsByDefault: true
    }
  }
}

test('AI Bridge page renders status, mode summary and collapsed advanced permissions', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState)

  assert.match(html, /Status da conexão/)
  assert.match(html, /Conectado/)
  assert.match(html, /Modo de permissões/)
  assert.match(html, /Dados sensíveis/)
  assert.match(html, /Configurar permissões avançadas/)
  assert.match(html, /<details class="ai-bridge-page__advanced">/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
  const permissionsMarkup = html.slice(html.indexOf('Permissões padrão do AI Bridge'))
  assert.doesNotMatch(permissionsMarkup, /secret-token/)
})

test('AI Bridge advanced permissions show default controls and hide session list before customization', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState, { advancedOpen: true })

  assert.match(html, /<details class="ai-bridge-page__advanced" open>/)
  assert.match(html, /data-ai-bridge-default-permission="allowQueryValuesByDefault"/)
  assert.match(html, /Sessão personalizada/)
  assert.match(html, /Personalizar esta sessão/)
  assert.match(html, /Restaurar padrão da sessão/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
})

test('AI Bridge session permission controls appear only when customizing the active session', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState, {
    advancedOpen: true,
    sessionPermissionsOpen: true
  })

  assert.match(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
  assert.match(html, /Dados que a IA pode ver/)
  assert.match(html, /Ações que a IA pode executar sem confirmação/)
})

test('AI Bridge page hides session permission controls when no session is active', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage({
    aiBridgeSession: { status: 'disabled' },
    settings: {}
  }, { advancedOpen: true })

  assert.match(html, /Inicie uma sessão para ajustar permissões temporárias/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})
