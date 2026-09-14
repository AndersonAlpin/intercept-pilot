# InterceptPilot UI Patterns

## Capture terminology

Use official capture terminology in the main UI.

Correct labels:

- PT: Captura ativa, Captura inativa, Captura completa, Captura leve, Ativar captura, Reiniciar captura, Parar captura, Capturar nova aba.
- EN: Capture active, Capture inactive, Full capture, Light capture, Activate capture, Restart capture, Stop capture, Capture new tab.
- ES: Captura activa, Captura inactiva, Captura completa, Captura ligera, Activar captura, Reiniciar captura, Parar captura, Capturar nueva pestaña.

Avoid in the main UI:

- Attach / Detach / Reattach.
- Anexar / Desanexar / Reanexar.
- Compatibility Mode.
- CDP Mode.
- Mockar.

Technical docs and old audit docs may mention old terms when describing history.

## Button variants

Use semantic variants consistently:

- `primary`: create, save, activate main flow.
- `secondary`: common supporting action such as reload, import, choose file, copy.
- `neutral` / base: cancel, close, low-emphasis default action.
- `danger`: destructive or stop action, such as delete or stop capture.
- `warning`: reset/clear/restart action, such as restart capture, clear network, clear logs.
- `info`: details, inspect, diagnostics.
- `ghost`: lightweight toolbar/inline action.

Examples:

- Correct: `Criar regra` = primary or secondary depending on context.
- Correct: `Limpar rede` = warning.
- Correct: `Limpar logs` = warning.
- Correct: `Inspecionar` = info.
- Incorrect: generic `Limpar` when the action clears data.

## Data Panel pattern

Full App data screens should use a Data Panel structure:

- Header: title, optional description, panel actions.
- Filters: inputs, selects, toggles, checkboxes.
- Body: list/table/content.
- Footer: count and/or pagination.

Rules:

- Actions that affect panel data belong in the header.
- Filters area should contain only filters.
- Footer stays outside the scrollable body.
- Use contextual count labels, not bare values like `1/1`.
- Prefer separate header/filter/body/footer blocks with an internal scrollable body over sticky elements inside the body scroll.

## Scroll and spacing

Scrollable Data Panel bodies must keep action columns away from the scrollbar.

Guidelines:

- Use internal scroll for long tables/lists.
- Avoid page-level scroll when a panel body should scroll.
- Apply right-side gutter only when needed.
- Avoid horizontal scroll unless the table is genuinely wide.
- Keep footer/pagination stable.
- Keep action columns and action headers aligned when the body gains a vertical scrollbar.

## Sidepanel compactness

The Sidepanel should be compact and readable:

- Cards should not grow huge because of long URLs or log messages.
- Use line clamp / truncation in lists.
- Keep full content available in details or tooltip/title when appropriate.
- Keep the capture header, tab selector, panel header, filters, and footer stable while only the active list scrolls.
- Keep counts close to the related filters/footer instead of floating separately.
- Avoid primary buttons repeated in every row/card unless truly needed.

## Live updates and clicks

Network and Logs can update while a user is clicking a row or action. These lists should:

- Use stable entry IDs for details/actions.
- Avoid opening items by array index.
- Defer list patching during the pointerdown-to-click cycle when rebuilding the list could remove the clicked element.
- Keep the latest pending update and flush it shortly after the click cycle completes.

Use the shared live-update guard instead of changing capture runtime behavior.

## Modal shell

Modals should use the shared modal shell pattern when practical:

- Header fixed.
- Body scrollable.
- Footer/actions fixed.
- Actions aligned to the right.
- Close icon centered inside a fixed-size icon button.
- Preserve Escape/backdrop behavior when it already exists.
- Preserve ids, handlers, and dirty/pristine state.

## AI Bridge UI

### Página AI Bridge

AI Bridge deve ficar em uma página dedicada no Full App, acessível pelo item `AI Bridge` no menu lateral. Não misture esse fluxo dentro de Configurações gerais.

A página deve conter:

- seção de status da conexão;
- configuração MCP;
- modos de permissão;
- permissões avançadas;
- ações curtas para copiar configuração, mostrar/ocultar configuração, regenerar chave e encerrar conexão.

Na própria página AI Bridge, botões não devem repetir `AI Bridge` no texto quando o contexto já estiver claro.

### Status de conexão

Status padronizados:

- `Desligado`;
- `Aguardando conexão`;
- `Conectado`;
- `Erro de conexão`, quando aplicável.

Use badge curta e texto explicativo curto. A configuração MCP deve ficar oculta por padrão depois que a conexão estiver pronta, com ações `Copiar configuração`, `Mostrar configuração`, `Ocultar configuração` e `Regenerar chave`.

### Modos de permissão

Modos atuais:

- `Restrito`;
- `Assistido`;
- `Avançado`;
- `Personalizado`.

Cada modo aparece como card clicável. Selecionar um preset aplica o conjunto de permissões. Os toggles refletem o modo selecionado. Ao alterar um toggle manualmente, o modo visual deve mudar para `Personalizado`.

Evite duplicar explicações entre o card do modo e a lista de permissões. O card explica o preset; cada permissão explica apenas seu efeito específico.

### Permissões avançadas

Use dois grupos:

- `Dados que a IA pode ver`;
- `Ações que a IA pode executar sem confirmação`.

Preferir lista vertical compacta, com label, descrição curta e toggle à direita. O card inteiro pode ser clicável. Alternar um toggle não deve levar o scroll de volta ao topo.

### Modal global de propostas

O modal global é usado para propostas vindas da IA e pode aparecer independente da tela atual. Ele deve comunicar origem, alvo e impacto sem virar painel de diagnóstico.

Padrão:

- título específico quando possível;
- badge `AI Bridge`;
- texto curto;
- alvo principal em destaque;
- impacto extra somente quando necessário;
- botões `Cancelar` e `Confirmar`;
- botão destrutivo específico para ações destrutivas quando fizer sentido, como `Excluir coleção`.

Evite `A IA solicitou...` no corpo quando o badge já comunica a origem. Evite repetir `Nada será aplicado sem sua confirmação` em todos os modais, porque os botões e o próprio modal já indicam confirmação.

### Copy dos modais

Diretrizes:

- ação simples usa texto simples;
- ação com impacto extra explica o impacto;
- ação destrutiva explica irreversibilidade;
- URL, regra e coleção devem ter destaque;
- não listar todas as regras de uma coleção quando o impacto puder ser resumido por contagem;
- não transformar o modal em diagnóstico detalhado.

Exemplos por fluxo:

- Importação de regra: `Importar a regra "{name}".`
- Importação de coleção: `Importar a coleção "{name}".` e `Isso criará {count} regras.`
- Ativar regra: `Ativar a regra "{name}".`
- Desativar regra: `Desativar a regra "{name}".`
- Ativar somente esta regra: `Ativar somente "{name}" nesta coleção.`
- Trocar coleção principal: `Usar "{name}" como coleção principal.`
- Recarregar aba capturada: `Recarregar a aba capturada.` e `Aba: {target}`.
- Editar regra: `Atualizar a regra "{name}".` seguido do diff.
- Editar coleção: `Atualizar a coleção "{name}".` seguido do diff.
- Excluir regra: `Excluir a regra "{name}".` e `Esta ação não pode ser desfeita.`
- Excluir coleção: `Excluir "{name}" também removerá {count} regras desta coleção.` e `Esta ação não pode ser desfeita.`

### Diff de edição

Para edição proposta pela IA, mostre:

- campo alterado;
- valor atual;
- novo valor;
- motivo, quando existir.

Use layout vertical legível. Não exponha dados sensíveis no diff sem a permissão correspondente.

## Import panel

Import should keep manual paste, file selection, and drag-and-drop on the same validation path.

- Keep drag/drop guidance concise and inside the textarea placeholder.
- Dropping one `.json` file fills the textarea and waits for the explicit import action.
- Do not bypass the parser/validator for dropped files.

## Update notes

The Full App sidebar can show an `Updates` item as the final navigation entry.

- Show an unread indicator for the current version until viewed.
- Hide the item after the post-read visibility window.
- Do not open the update-notes modal automatically on app entry.
- Keep update-note content localized through the release notes/i18n path.

## Network and logs truncation

Network:

- Compact cards should summarize data URLs.
- Long query strings should truncate visually.
- Inspector must preserve and show the real full URL.

Logs:

- Lists/cards should truncate long messages and URLs.
- Clicking a log should open full details.
- Details should wrap long content safely and avoid horizontal overflow.

## Empty states

Use contextual empty states:

- No active capture: ask the user to activate capture to see requests/logs.
- Active capture with no data: say there are no requests/logs yet.
- Empty states should not imply old data belongs to the current capture.

## i18n

Visible text should use `src/shared/i18n.js` and `src/shared/locales/`.

When adding labels:

- Add PT, EN, and ES.
- Keep terms consistent with `AGENTS.md`.
- Do not hardcode user-visible text in components unless the file already uses a local-only constant and there is a clear reason.

## Label examples

Correct:

- PT: `Criar regra`, `Limpar rede`, `Limpar logs`, `Automático`.
- EN: `Create rule`, `Clear network`, `Clear logs`, `Auto`.
- ES: `Crear regla`, `Limpiar red`, `Limpiar logs`, `Automático`.

Incorrect:

- `Mockar`
- `Attach`
- `Detach`
- `Compatibility Mode`
- `CDP Mode`
- generic `Limpar` for a data-clearing action.
