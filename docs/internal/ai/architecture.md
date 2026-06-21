# InterceptPilot Architecture Notes

## Overview

InterceptPilot is a Manifest V3 browser extension with a background service worker, shared domain helpers, and two UI surfaces: Sidepanel and Full App.

The codebase intentionally uses vanilla JavaScript, HTML templates, and CSS. There is no framework and no bundler.

## Main areas

`src/background/`

- Owns capture lifecycle, debugger integration, rule matching, runtime state, and broadcasts.
- `src/background/background.js` is the main orchestration file.
- `debugger.js` handles CDP / `chrome.debugger` work for Full capture.
- `runtime-state.js` stores in-memory capture/network/log/rule state.
- `rule-engine.js` evaluates rules against requests.
- `logger.js` records extension and page logs.

`src/shared/`

- Shared utilities, i18n, storage, messaging, models, validators, release notes, display helpers, and UI primitives.
- UI helpers in `src/shared/ui/` should remain pure HTML-string render helpers.

`src/sidepanel/`

- Compact UI for rules, network, logs, collection switching, and capture controls.
- Prioritizes density and truncation for long content.

`src/fullapp/`

- Larger workspace with dashboard, rules, collections, network, logs, import, diagnostics, settings, and update notes.
- Data-heavy pages use the Data Panel layout pattern.

## AI Bridge / MCP

### Visão geral

AI Bridge é a ponte local entre o InterceptPilot e agentes de IA que suportam MCP. Ele permite que um agente local leia contexto permitido da extensão, consulte dados sanitizados e proponha ações assistidas sem receber acesso bruto ao estado interno.

Hoje a IA pode:

- ler o contexto de teste permitido;
- consultar requests, logs, resultados de regras, regras e coleções;
- buscar requests, logs, resultados e regras com filtros;
- diagnosticar o match entre uma regra e um request capturado;
- propor importação de regras ou coleções;
- solicitar ações assistidas em regras e coleções;
- editar campos seguros de regras e coleções conforme permissões;
- solicitar reload da aba capturada;
- validar o resultado depois de uma ação usando as tools de leitura.

### Arquitetura atual

Fluxo atual:

```txt
AI client
  -> MCP adapter
  -> shared local daemon
  -> extension WebSocket connection
  -> InterceptPilot background
  -> Full App / modal global / storage / runtime state
```

O adapter expõe as tools MCP por stdio para o cliente de IA. Ele se conecta a um daemon local compartilhado, que escuta em `127.0.0.1` e aceita múltiplos adapters usando a mesma stable connection key.

O daemon é único por porta e apenas roteia mensagens entre adapters MCP e a extensão. Ele não decide permissões, não aplica ações, não guarda propostas pendentes e não altera estado da captura.

A extensão é dona de:

- permissões de dados e ações;
- propostas pendentes;
- confirmações humanas;
- estado de captura;
- storage de regras e coleções;
- runtime state de requests, logs e resultados;
- aplicação real das ações.

Se a extensão desconectar, o daemon continua vivo e aceita adapters. Tool calls retornam erro seguro até a extensão reconectar. Adapters já conectados voltam a funcionar depois da reconexão da extensão, sem precisar reiniciar o cliente MCP.

### Modelo de conexão

A stable connection key é a credencial persistente exibida pela página AI Bridge e usada na configuração MCP. Ela não é a sessão.

- `Iniciar` habilita a ponte da extensão com a key atual.
- `Encerrar` encerra a conexão da extensão com o daemon.
- `Regenerar chave` cria uma nova stable connection key e invalida configurações MCP antigas.
- Alterar permissões não invalida a key.
- Vários chats ou clientes MCP podem usar a mesma key e a mesma porta porque todos falam com o daemon compartilhado.
- O heartbeat/keepalive fica entre daemon e extensão.

O pacote `interceptpilot-mcp` ainda está privado e com versão `0.0.0`. No estado atual, a configuração local/dev deve apontar para o arquivo local do pacote. A configuração futura com `npx interceptpilot-mcp` depende de publicação.

### Modelo de permissões

Os modos atuais são:

- `Restrito`: dados sensíveis ficam ocultos e ações exigem confirmação.
- `Assistido`: mantém dados sensíveis ocultos e permite ações de regra sem confirmação.
- `Avançado`: libera dados sensíveis e ações avançadas sem confirmação, conforme toggles do modo.
- `Personalizado`: combinação manual de permissões.

As permissões são separadas em permissões de dados e permissões de ações.

Permissões de dados controlam exposição de valores de query string, headers de request, headers de response, body de request, body de response e logs detalhados.

Permissões de ações controlam aplicação de importação sem confirmação, ações de regra/coleção sem confirmação e reload da aba capturada sem confirmação.

O padrão seguro é não expor dados sensíveis e não aplicar ações sem confirmação. Permissões não são a mesma coisa que key ou conexão. A key autentica a conexão local; as permissões determinam o que a IA pode ver ou executar durante o uso.

### Propostas e ações assistidas

Algumas tools criam propostas para confirmação no modal global do Full App. Dependendo da permissão ativa, algumas ações podem ser aplicadas diretamente.

Fluxos atuais:

- importação proposta de regra ou coleção;
- ativar regra;
- desativar regra;
- deixar somente uma regra ativa na coleção;
- trocar a coleção principal;
- editar campos seguros de regra;
- editar campos seguros de coleção;
- excluir regra;
- excluir coleção;
- recarregar a aba capturada.

Edição de regra não permite alteração de `responseBody` ou `responseHeaders` pelo MCP. Deleção de regra e coleção é sempre protegida por proposta e confirmação humana.

### Segurança

Princípios atuais:

- não expor objetos brutos da extensão;
- sanitizar por padrão;
- usar allowlist de comandos MCP;
- não oferecer `getFullState` bruto;
- não expor headers, bodies, cookies, Authorization ou valores de query sem permissão;
- não oferecer `clear_logs`;
- não oferecer `set_capture_mode`;
- não oferecer reload genérico;
- não controlar captura/debugger diretamente via MCP;
- retornar erros seguros quando a extensão está desconectada, a key é inválida ou o comando não é permitido;
- não mostrar a stable connection key em logs, erros, snackbars ou retornos MCP.

## Capture flows

### Full capture

Full capture uses CDP through `chrome.debugger`.

General flow:

1. User activates capture.
2. Background attaches debugger to the active target tab.
3. Network/debugger events are collected and normalized.
4. Rule engine evaluates matching requests.
5. Runtime state is updated.
6. UI receives state broadcasts and renders visible Network/Logs for the active capture context.

Full capture can see more request types, but may conflict with DevTools or other debugger-based extensions.

### Light capture

Light capture avoids `chrome.debugger` and uses fetch interception plus basic page-log capture.

General flow:

1. User activates capture.
2. Background enables the lightweight interception path.
3. Fetch activity is collected with less coverage than Full capture.
4. Basic console/error activity is bridged from the page context into web logs.
5. Rule matching and UI updates follow the same high-level runtime state path.

Light capture is more compatible, but network interception is currently limited to fetch and page-log capture is not CDP-equivalent.

## Network flow

Network entries are created in the background and tagged with capture context where available, including active tab/cycle/session metadata.

UI code should use the shared capture-context helpers instead of showing raw historical entries directly. Network views must only show entries belonging to the active capture context.

Important UI files:

- `src/fullapp/components/network-page.js`
- `src/fullapp/components/network-inspector-modal.js`
- `src/sidepanel/components/network-quick-panel.js`
- `src/shared/ui/dom.js` for guarded live-list patching during pointer interactions.

## Rules flow

Rules live in shared storage and are evaluated by the background rule engine.

UI pages should not change hit-state logic unless explicitly scoped. Preserve:

- rule enable/disable behavior;
- action badges;
- state badges/dots;
- hit counters;
- diagnostics fields used by rule state.

Important files:

- `src/background/rule-engine.js`
- `src/shared/rule-state.js`
- `src/fullapp/components/rules-page.js`
- `src/sidepanel/components/rules-quick-panel.js`

## Logs flow

Logs can come from page/web context or extension/internal context.

The main Logs UI should show logs for the active capture context. Internal diagnostics can remain visible in Diagnostics when appropriate.

Important files:

- `src/background/logger.js`
- `src/fullapp/components/logs-page.js`
- `src/sidepanel/components/logs-quick-panel.js`
- `src/shared/ui/log-detail.js`

## Live-updating list interactions

Network and Logs can receive state broadcasts while the user is pressing a row or row action. UI code should preserve stable IDs for entries and avoid index-based open/detail flows.

When a live list can be rebuilt during pointer interactions, use `createLiveUpdateGuard` from `src/shared/ui/dom.js` to defer the patch until the click cycle finishes. This keeps Network/Logs interactions from losing clicks while still allowing real-time updates to flush shortly after release.

Do not solve this by changing capture runtime behavior, rule matching, or hit state.

## Import flow

The Full App Import screen supports manual paste, file selection, and JSON drag-and-drop into the editor area.

Dropping a single `.json` file should fill the textarea and wait for the user to click `Import JSON`. The existing parser/validator path remains the source of truth for actual import behavior.

Important files:

- `src/fullapp/components/import-export-page.js`
- `src/fullapp/fullapp.js`
- `src/shared/import-export.js`

## Release notes flow

Full App update notes are driven by the current extension version from `chrome.runtime.getManifest().version`.

Release-note content lives in `src/shared/release-notes.js` and localized strings live in `src/shared/locales/`. Seen state is stored outside user settings with dedicated storage keys:

- `releaseNotesLastSeenVersion`
- `releaseNotesLastSeenAt`

The sidebar `Updates` item shows an unread indicator until the current version is viewed. After viewing, it remains visible for the configured post-read window and then hides automatically. The modal should open only from the manual sidebar path, not automatically on Full App entry.

## Sidepanel vs Full App

Sidepanel:

- Compact.
- Fast actions.
- Cards and short controls.
- Aggressive truncation for long URLs/logs.

Full App:

- Data Panels.
- Larger tables/lists.
- Header actions separated from filters.
- Footer counts/pagination outside scrollable bodies.
- Internal scroll belongs to the body/list area, not to the whole panel when the header, filters, and footer should remain stable.

## Storage and state

Use shared storage helpers for persisted settings, collections, and rules. Runtime-only capture state should remain in the background runtime state unless there is a clear reason to persist it.

Avoid storage migrations unless explicitly scoped.

## Messaging and broadcasts

The background sends state updates to UIs. UI code should avoid direct runtime assumptions and should render from received state plus shared display/context helpers.

When changing message names or payloads, update both Full App and Sidepanel paths.

## Shared helpers

Shared helper locations:

- `src/shared/ui/`: HTML render primitives.
- `src/shared/capture-context.js`: active capture visibility filtering.
- `src/shared/network-display.js`: network display formatting.
- `src/shared/log-display.js`: log display formatting.
- `src/shared/i18n.js` and `src/shared/locales/`: visible labels.
- `src/shared/release-notes.js`: versioned update-note mapping.

Keep helpers small, explicit, and easy to validate.
