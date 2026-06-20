import test from 'node:test'
import assert from 'node:assert/strict'

import { setLocale } from '../src/shared/i18n.js'
import { renderAiBridgePage } from '../src/fullapp/components/ai-bridge-page.js'
import {
  AI_BRIDGE_PERMISSION_MODES,
  createAiBridgeDefaultPermissionsForMode,
  createAiBridgeSessionPermissionsForMode
} from '../src/shared/ai-bridge-permissions.js'

function disabledState(aiBridgePermissions = {}) {
  return {
    aiBridgeSession: { status: 'disabled' },
    settings: { aiBridgePermissions }
  }
}

function connectedState(permissions = {}) {
  return {
    aiBridgeSession: {
    status: 'connected',
    token: 'secret-token',
    port: 37177,
    startedAt: '2026-06-20T10:00:00.000Z',
    connectedAt: '2026-06-20T10:01:00.000Z',
      permissions
    },
    settings: {
      aiBridgePermissions: {}
    }
  }
}

test('AI Bridge page renders clickable permission mode cards', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState())

  assert.match(html, /Status da conexão/)
  assert.match(html, /Desligado/)
  assert.match(html, /Modo de permissões/)
  assert.match(html, /<button class="ai-bridge-mode-card is-active" type="button" data-ai-bridge-mode="safe" aria-pressed="true">/)
  assert.match(html, /data-ai-bridge-mode="assisted"/)
  assert.match(html, /data-ai-bridge-mode="advanced"/)
  assert.match(html, /data-ai-bridge-mode="custom"/)
  assert.match(html, /Restrito[\s\S]*Dados sensíveis ocultos e ações exigem confirmação\./)
  assert.match(html, /Assistido[\s\S]*Dados sensíveis ocultos e ações de regra podem ser executadas sem confirmação\./)
  assert.match(html, /Avançado[\s\S]*Dados disponíveis podem ser compartilhados e ações avançadas podem ser executadas sem confirmação\./)
  assert.match(html, /Personalizado[\s\S]*Escolha manualmente quais dados a IA pode ver e quais ações pode executar sem confirmação\./)
  assert.doesNotMatch(html, /Debug avançado/)
  assert.match(html, /Configurar permissões avançadas/)
  assert.match(html, /<details class="ai-bridge-page__advanced">/)
  assert.doesNotMatch(html, /Sessão atual/)
  assert.doesNotMatch(html, /Sem sessão/)
})

test('AI Bridge predefined modes show summaries instead of editable default toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(), { advancedOpen: true })

  assert.match(html, /<details class="ai-bridge-page__advanced" open>/)
  assert.match(html, /Oculta dados sensíveis/)
  assert.match(html, /Editar permissões personalizadas/)
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge custom mode shows editable default permission toggles without a session', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(), {
    advancedOpen: true,
    defaultPermissionsOpen: true
  })

  assert.match(html, /data-ai-bridge-mode="custom" aria-pressed="true"/)
  assert.match(html, /data-ai-bridge-default-permission="allowQueryValuesByDefault"/)
  assert.match(html, /Dados que a IA pode ver/)
  assert.match(html, /Ações que a IA pode executar sem confirmação/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge advanced debug preset summary releases every available permission', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(
    createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.advanced)
  ), { advancedOpen: true })

  assert.match(html, /data-ai-bridge-mode="advanced" aria-pressed="true"/)
  assert.match(html, /Dados sensíveis[\s\S]*Liberados/)
  assert.match(html, /Ações sem confirmação[\s\S]*Liberadas/)
  assert.match(html, /Este modo pode compartilhar dados sensíveis/)
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
})

test('AI Bridge page hides session permission controls when no session is active', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(), { advancedOpen: true })

  assert.match(html, /Inicie uma sessão para ajustar permissões temporárias/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge active session can be customized or restored without showing session toggles by default', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState(
    createAiBridgeSessionPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.assisted)
  ), { advancedOpen: true })

  assert.match(html, /data-ai-bridge-mode="assisted" aria-pressed="true"/)
  assert.match(html, /Personalizar esta sessão/)
  assert.match(html, /Restaurar padrão da sessão/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge custom active session shows editable session permission toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState({
    allowQueryValuesThisSession: true
  }), {
    advancedOpen: true,
    sessionPermissionsOpen: true
  })

  assert.match(html, /data-ai-bridge-mode="custom" aria-pressed="true"/)
  assert.match(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
})
