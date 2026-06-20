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

function defaultToggle(html, key) {
  return html.match(new RegExp(`<input[^>]+data-ai-bridge-default-permission="${key}"[^>]*>`))?.[0] || ''
}

function sessionToggle(html, key) {
  return html.match(new RegExp(`<input[^>]+data-ai-bridge-session-permission="${key}"[^>]*>`))?.[0] || ''
}

function assertDefaultToggleChecked(html, key) {
  assert.match(defaultToggle(html, key), /checked/)
}

function assertDefaultToggleUnchecked(html, key) {
  assert.doesNotMatch(defaultToggle(html, key), /checked/)
}

function assertSessionToggleChecked(html, key) {
  assert.match(sessionToggle(html, key), /checked/)
}

function assertSessionToggleUnchecked(html, key) {
  assert.doesNotMatch(sessionToggle(html, key), /checked/)
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
  assert.match(html, /Avançado[\s\S]*Dados sensíveis liberados e ações avançadas podem ser executadas sem confirmação\./)
  assert.match(html, /Personalizado[\s\S]*Escolha manualmente quais dados a IA pode ver e quais ações pode executar sem confirmação\./)
  assert.doesNotMatch(html, /Debug avançado/)
  assert.doesNotMatch(html, /Configurar permissões avançadas/)
  assert.doesNotMatch(html, /Editar permissões personalizadas/)
  assert.doesNotMatch(html, /<details class="ai-bridge-page__advanced"/)
  assert.match(html, /Permissões avançadas/)
  assert.match(html, /data-ai-bridge-default-permission="allowQueryValuesByDefault"/)
  assert.doesNotMatch(html, /Sessão atual/)
  assert.doesNotMatch(html, /Sem sessão/)
})

test('AI Bridge restricted mode shows a safe summary and disables all toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState())

  assert.match(html, /data-ai-bridge-mode="safe" aria-pressed="true"/)
  assert.match(html, /Dados sensíveis[\s\S]*Ocultos/)
  assert.match(html, /Ações sem confirmação[\s\S]*Nenhuma/)
  assertDefaultToggleUnchecked(html, 'allowQueryValuesByDefault')
  assertDefaultToggleUnchecked(html, 'allowRequestHeadersByDefault')
  assertDefaultToggleUnchecked(html, 'allowResponseHeadersByDefault')
  assertDefaultToggleUnchecked(html, 'allowRequestBodyByDefault')
  assertDefaultToggleUnchecked(html, 'allowResponseBodyByDefault')
  assertDefaultToggleUnchecked(html, 'allowDetailedLogsByDefault')
  assertDefaultToggleUnchecked(html, 'allowImportBundleApplyByDefault')
  assertDefaultToggleUnchecked(html, 'allowRuleActionsByDefault')
  assertDefaultToggleUnchecked(html, 'allowCapturedTabReloadByDefault')
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge assisted mode enables only rule actions and keeps data hidden', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(
    createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.assisted)
  ))

  assert.match(html, /data-ai-bridge-mode="assisted" aria-pressed="true"/)
  assert.match(html, /Dados sensíveis[\s\S]*Ocultos/)
  assert.match(html, /Ações sem confirmação[\s\S]*Ações de regra/)
  assertDefaultToggleUnchecked(html, 'allowQueryValuesByDefault')
  assertDefaultToggleUnchecked(html, 'allowRequestHeadersByDefault')
  assertDefaultToggleUnchecked(html, 'allowResponseHeadersByDefault')
  assertDefaultToggleUnchecked(html, 'allowRequestBodyByDefault')
  assertDefaultToggleUnchecked(html, 'allowResponseBodyByDefault')
  assertDefaultToggleUnchecked(html, 'allowDetailedLogsByDefault')
  assertDefaultToggleUnchecked(html, 'allowImportBundleApplyByDefault')
  assertDefaultToggleChecked(html, 'allowRuleActionsByDefault')
  assertDefaultToggleUnchecked(html, 'allowCapturedTabReloadByDefault')
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge custom mode keeps current default values and allows editing without a session', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState({
    allowQueryValuesByDefault: true
  }), {
    defaultPermissionsOpen: true
  })

  assert.match(html, /data-ai-bridge-mode="custom" aria-pressed="true"/)
  assert.match(html, /data-ai-bridge-default-permission="allowQueryValuesByDefault"/)
  assertDefaultToggleChecked(html, 'allowQueryValuesByDefault')
  assertDefaultToggleUnchecked(html, 'allowRequestHeadersByDefault')
  assert.match(html, /Dados que a IA pode ver/)
  assert.match(html, /Ações que a IA pode executar sem confirmação/)
  assert.doesNotMatch(html, /Editar permissões personalizadas/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge advanced preset summary releases every available permission and enables all toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(
    createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.advanced)
  ))

  assert.match(html, /data-ai-bridge-mode="advanced" aria-pressed="true"/)
  assert.match(html, /Dados sensíveis[\s\S]*Liberados/)
  assert.match(html, /Ações sem confirmação[\s\S]*Liberadas/)
  assert.match(html, /Este modo pode compartilhar dados sensíveis/)
  assertDefaultToggleChecked(html, 'allowQueryValuesByDefault')
  assertDefaultToggleChecked(html, 'allowRequestHeadersByDefault')
  assertDefaultToggleChecked(html, 'allowResponseHeadersByDefault')
  assertDefaultToggleChecked(html, 'allowRequestBodyByDefault')
  assertDefaultToggleChecked(html, 'allowResponseBodyByDefault')
  assertDefaultToggleChecked(html, 'allowDetailedLogsByDefault')
  assertDefaultToggleChecked(html, 'allowImportBundleApplyByDefault')
  assertDefaultToggleChecked(html, 'allowRuleActionsByDefault')
  assertDefaultToggleChecked(html, 'allowCapturedTabReloadByDefault')
})

test('AI Bridge page hides session permission controls and guidance when no session is active', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(), { defaultPermissionsOpen: true })

  assert.doesNotMatch(html, /Inicie uma sessão para ajustar permissões temporárias/)
  assert.doesNotMatch(html, /data-ai-bridge-session-permission=/)
})

test('AI Bridge active assisted session shows rule action summary and session toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState(
    createAiBridgeSessionPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.assisted)
  ))

  assert.match(html, /data-ai-bridge-mode="assisted" aria-pressed="true"/)
  assert.match(html, /Ações sem confirmação[\s\S]*Ações de regra/)
  assert.doesNotMatch(html, /Personalizar esta sessão/)
  assert.match(html, /Restaurar padrão da sessão/)
  assertSessionToggleUnchecked(html, 'allowQueryValuesThisSession')
  assertSessionToggleChecked(html, 'allowRuleActionsThisSession')
})

test('AI Bridge custom active session shows editable session permission toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState({
    allowQueryValuesThisSession: true
  }), {
    sessionPermissionsOpen: true
  })

  assert.match(html, /data-ai-bridge-mode="custom" aria-pressed="true"/)
  assert.match(html, /Sessão personalizada/)
  assert.match(html, /Restaurar padrão da sessão/)
  assert.match(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
  assertSessionToggleChecked(html, 'allowQueryValuesThisSession')
  assertSessionToggleUnchecked(html, 'allowRuleActionsThisSession')
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
})
