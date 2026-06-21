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
      port: 37177,
      startedAt: '2026-06-20T10:00:00.000Z',
      connectedAt: '2026-06-20T10:01:00.000Z',
      permissions
    },
    settings: {
      aiBridgePermissions: {},
      aiBridgeConnectionKey: 'secret-token'
    }
  }
}

function waitingState(permissions = {}) {
  return {
    aiBridgeSession: {
      status: 'waiting',
      port: 37177,
      startedAt: '2026-06-20T10:00:00.000Z',
      connectedAt: null,
      permissions
    },
    settings: {
      aiBridgePermissions: {},
      aiBridgeConnectionKey: 'secret-token'
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
  assert.match(html, /Conecte o InterceptPilot a agentes de IA locais para analisar contexto de testes, consultar requests, logs e regras, propor importações e executar ações assistidas conforme as permissões configuradas\./)
  assert.match(html, /Modo de permissões/)
  assert.match(html, /<button class="ai-bridge-mode-card is-active" type="button" data-ai-bridge-mode="safe" aria-pressed="true">/)
  assert.match(html, /data-ai-bridge-mode="assisted"/)
  assert.match(html, /data-ai-bridge-mode="advanced"/)
  assert.match(html, /data-ai-bridge-mode="custom"/)
  assert.match(html, /Restrito[\s\S]*Dados sensíveis ocultos e ações exigem confirmação\./)
  assert.match(html, /Assistido[\s\S]*Dados sensíveis ocultos e ações de regras e coleções podem ser executadas sem confirmação\./)
  assert.match(html, /Avançado[\s\S]*Dados sensíveis liberados e ações avançadas podem ser executadas sem confirmação\./)
  assert.match(html, /Personalizado[\s\S]*Escolha manualmente quais dados a IA pode ver e quais ações pode executar sem confirmação\./)
  assert.doesNotMatch(html, /Debug avançado/)
  assert.doesNotMatch(html, /Configurar permissões avançadas/)
  assert.doesNotMatch(html, /Editar permissões personalizadas/)
  assert.doesNotMatch(html, /<details class="ai-bridge-page__advanced"/)
  assert.doesNotMatch(html, /Permissões do modo atual/)
  assert.doesNotMatch(html, /Restaurar padrão da sessão/)
  assert.doesNotMatch(html, /Sessão usando permissões padrão/)
  assert.doesNotMatch(html, /Essas permissões podem compartilhar dados sensíveis/)
  assert.match(html, /Permissões avançadas/)
  assert.match(html, /ai-bridge-permission-item/)
  assert.match(html, /data-ai-bridge-default-permission="allowQueryValuesByDefault"/)
  assert.match(html, /Dados que a IA pode ver/)
  assert.match(html, /Ações que a IA pode executar sem confirmação/)
  assert.match(html, /Expor valores de query string/)
  assert.match(html, /Permite enviar valores dos parâmetros da URL\./)
  assert.match(html, /Expor headers de request/)
  assert.match(html, /Permite enviar headers capturados da requisição\./)
  assert.match(html, /Expor headers de response/)
  assert.match(html, /Permite enviar headers recebidos na resposta\./)
  assert.match(html, /Expor body de request/)
  assert.match(html, /Permite enviar o corpo da requisição, com limite e truncamento\./)
  assert.match(html, /Expor body de response/)
  assert.match(html, /Permite enviar o corpo da resposta, com limite e truncamento\./)
  assert.match(html, /Expor logs detalhados/)
  assert.match(html, /Permite enviar logs com mais contexto para diagnóstico\./)
  assert.match(html, /Aplicar importações sem confirmação/)
  assert.match(html, /Permite criar regras ou coleções propostas pela IA sem pedir confirmação\./)
  assert.match(html, /Executar ações de regras e coleções sem confirmação/)
  assert.match(html, /Permite ativar, desativar, isolar regras ou definir a coleção principal sem pedir confirmação\./)
  assert.match(html, /Recarregar aba capturada sem confirmação/)
  assert.match(html, /Permite recarregar somente a aba capturada sem pedir confirmação\./)
  assert.doesNotMatch(html, /sem abrir modal/)
  assert.doesNotMatch(html, /Sessão atual/)
  assert.doesNotMatch(html, /Sem sessão/)
})

test('AI Bridge advanced permissions render as a vertical list', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState())

  assert.match(html, /<div class="ai-bridge-permission-list">\s*<label class="ai-bridge-permission-item" for="ai-bridge-default-allow-query-values">/)
  assert.match(html, /<div class="ai-bridge-permission-item__copy">\s*<strong>Expor valores de query string<\/strong>\s*<span id="ai-bridge-default-allow-query-values-description">Permite enviar valores dos parâmetros da URL\.<\/span>/)
  assert.match(html, /aria-describedby="ai-bridge-default-allow-query-values-description"/)
  assert.match(html, /<span class="switch settings-toggle ai-bridge-permission-toggle">\s*<input/)
})

test('AI Bridge disabled status is compact and does not expose MCP configuration', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState())

  assert.match(html, /data-state="danger" data-ai-bridge-status="disabled"[\s\S]*Desligado/)
  assert.match(html, /A IA não acessa dados da extensão enquanto o AI Bridge estiver desligado\./)
  assert.match(html, /id="settings-ai-bridge-start-btn"/)
  assert.doesNotMatch(html, /settings-ai-bridge-copy-config-btn/)
  assert.doesNotMatch(html, /settings-ai-bridge-toggle-config-btn/)
  assert.doesNotMatch(html, /settings-ai-bridge-config/)
  assert.doesNotMatch(html, /secret-token/)
})

test('AI Bridge waiting status hides MCP configuration by default and shows warning actions', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(waitingState())

  assert.match(html, /data-state="warning" data-ai-bridge-status="waiting"[\s\S]*Aguardando conexão/)
  assert.match(html, /Conecte o InterceptPilot a agentes de IA locais para analisar contexto de testes, consultar requests, logs e regras, propor importações e executar ações assistidas conforme as permissões configuradas\./)
  assert.match(html, /Aguardando conexão do bridge local\. Use a configuração desta sessão no seu cliente MCP\./)
  assert.doesNotMatch(html, /data-ai-bridge-status="waiting"[\s\S]*Aguardando bridge local/)
  assert.doesNotMatch(html, /Inicie o pacote MCP usando a configuração desta sessão/)
  assert.match(html, /id="settings-ai-bridge-revoke-btn"/)
  assert.match(html, /id="settings-ai-bridge-copy-config-btn"/)
  assert.match(html, /id="settings-ai-bridge-toggle-config-btn"[\s\S]*Mostrar configuração/)
  assert.doesNotMatch(html, /settings-ai-bridge-config/)
  assert.doesNotMatch(html, /secret-token/)
})

test('AI Bridge connected status shows success copy and keeps MCP configuration collapsed', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState())

  assert.match(html, /data-state="success" data-ai-bridge-status="connected"[\s\S]*Conectado/)
  assert.match(html, /AI Bridge conectado\. As tools MCP podem usar apenas os dados e ações permitidos por esta sessão\./)
  assert.doesNotMatch(html, /podem acessar apenas/)
  assert.match(html, /id="settings-ai-bridge-copy-config-btn"/)
  assert.match(html, /id="settings-ai-bridge-toggle-config-btn"[\s\S]*Mostrar configuração/)
  assert.doesNotMatch(html, /settings-ai-bridge-config/)
  assert.doesNotMatch(html, /secret-token/)
})

test('AI Bridge MCP configuration can be explicitly shown and hidden', () => {
  setLocale('pt-BR')

  const expanded = renderAiBridgePage(connectedState(), { configVisible: true })
  const collapsed = renderAiBridgePage(connectedState(), { configVisible: false })

  assert.match(expanded, /Use esta configuração no cliente MCP enquanto esta sessão estiver ativa\./)
  assert.match(expanded, /id="settings-ai-bridge-config"/)
  assert.match(expanded, /secret-token/)
  assert.match(expanded, /id="settings-ai-bridge-toggle-config-btn"[\s\S]*Ocultar configuração/)
  assert.doesNotMatch(collapsed, /settings-ai-bridge-config/)
  assert.doesNotMatch(collapsed, /secret-token/)
  assert.match(collapsed, /id="settings-ai-bridge-toggle-config-btn"[\s\S]*Mostrar configuração/)
})

test('AI Bridge connection status does not render raw i18n keys', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(waitingState(), { configVisible: true })

  assert.doesNotMatch(html, /fullapp\./)
  assert.doesNotMatch(html, /toasts\./)
  assert.doesNotMatch(html, /common\./)
})

test('AI Bridge restricted mode disables all toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState())

  assert.match(html, /data-ai-bridge-mode="safe" aria-pressed="true"/)
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

test('AI Bridge advanced mode enables every available permission toggle', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(disabledState(
    createAiBridgeDefaultPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.advanced)
  ))

  assert.match(html, /data-ai-bridge-mode="advanced" aria-pressed="true"/)
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

test('AI Bridge active assisted session shows session toggles', () => {
  setLocale('pt-BR')

  const html = renderAiBridgePage(connectedState(
    createAiBridgeSessionPermissionsForMode(AI_BRIDGE_PERMISSION_MODES.assisted)
  ))

  assert.match(html, /data-ai-bridge-mode="assisted" aria-pressed="true"/)
  assert.doesNotMatch(html, /Personalizar esta sessão/)
  assert.doesNotMatch(html, /Restaurar padrão da sessão/)
  assert.doesNotMatch(html, /Sessão usando permissões padrão/)
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
  assert.doesNotMatch(html, /Sessão personalizada/)
  assert.doesNotMatch(html, /Restaurar padrão da sessão/)
  assert.match(html, /data-ai-bridge-session-permission="allowQueryValuesThisSession"/)
  assertSessionToggleChecked(html, 'allowQueryValuesThisSession')
  assertSessionToggleUnchecked(html, 'allowRuleActionsThisSession')
  assert.doesNotMatch(html, /data-ai-bridge-default-permission=/)
})
