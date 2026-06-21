# Componentes e UI compartilhada

Este documento descreve o estado atual da camada visual compartilhada do InterceptPilot e a direção desejada para manutenção de helpers, componentes e CSS.

## Investigação atual do CSS compartilhado

`src/shared/base.css` é carregado em:

- `src/fullapp/fullapp.html`, antes de `src/fullapp/fullapp.css`;
- `src/sidepanel/sidepanel.html`, antes de `src/sidepanel/sidepanel.css`.

Hoje ele contém:

- variáveis globais de scrollbar;
- regras globais de scrollbar;
- `box-sizing`;
- `textarea { resize: vertical; }`;
- estilos de `.badge` e variantes `.success`, `.warning`, `.danger`, `.info`, `.secondary` e `.contrast`.

O que depende dele hoje:

- scrollbars globais do Full App e Sidepanel;
- comportamento global de `box-sizing`;
- resize vertical de `textarea`;
- badges renderizados pelo helper `src/shared/ui/badge.js`, incluindo badges usados em Full App, Sidepanel, logs, network, status de regra e AI Bridge.

Conclusão atual: `base.css` é uma mistura pequena de base global com CSS de componente compartilhado. Ele é carregado nas duas superfícies e cumpre função real, mas não é um CSS completo de componentes compartilhados. Badge está centralizado nele; outros componentes compartilhados ainda têm estilos em `src/fullapp/fullapp.css` e `src/sidepanel/sidepanel.css`.

## Onde ficam os estilos hoje

- Botões: helper em `src/shared/ui/button.js`; estilos `.btn` e variantes em `src/fullapp/fullapp.css` e `src/sidepanel/sidepanel.css`.
- Icon buttons: helper em `src/shared/ui/icon-button.js`; estilos `.icon-btn` em `fullapp.css` e `sidepanel.css`.
- Badges: helper em `src/shared/ui/badge.js`; estilos base e variantes em `src/shared/base.css`, com alguns ajustes locais em `fullapp.css` e `sidepanel.css`.
- Toggles: helper em `src/shared/ui/toggle.js`; estilos `.switch` e `.status-toggle` em `fullapp.css` e `sidepanel.css`.
- Selects: helper em `src/shared/ui/select.js`; estilos `.select-menu` em `fullapp.css` e `sidepanel.css`.
- Modal shell: helper em `src/shared/ui/modal-shell.js`; estilos `.modal`, `.modal-backdrop`, `.modal-shell-*` em `fullapp.css` e `sidepanel.css`.
- Toasts: helper em `src/shared/toast.js`; estilos `.toast-*` em `fullapp.css` e `sidepanel.css`.
- Dialogs: helper em `src/shared/dialogs.js`, baseado em `modal-shell`; estilos `.dialog-*` em `fullapp.css` e `sidepanel.css`.
- Data Panel: helper em `src/shared/ui/data-panel.js`; estilos `.data-panel*` em `fullapp.css`.
- Dropdown menu: helper em `src/shared/ui/dropdown-menu.js`; estilos `.dropdown-menu*` em `fullapp.css` e `sidepanel.css`.
- Empty state: helper em `src/shared/ui/empty-state.js`; estilos `.empty` e `.empty-helper` em `fullapp.css` e `sidepanel.css`.
- Pagination: helper em `src/shared/ui/pagination.js`; estilos de paginação ainda usam classes de network em `fullapp.css` e `sidepanel.css`.
- Floating selection bar: helper em `src/shared/ui/floating-selection-bar.js`; estilos em `fullapp.css`.

Há duplicação real entre Full App e Sidepanel para botões, icon buttons, toggles, selects, modal shell, dialogs, toasts, dropdown menu e empty states. Isso permite ajustes por superfície, mas também cria risco de variantes divergirem.

## Propósito da camada compartilhada

`src/shared/ui/` deve concentrar helpers e componentes reutilizáveis, pequenos e previsíveis.

Esses helpers devem:

- evitar lógica pesada de feature;
- receber dados/opções e retornar HTML string, conforme o padrão atual;
- não depender diretamente de estado específico de uma página;
- preservar `escapeHtml`, i18n, ARIA, ids, handlers e `data-*`;
- ser usados tanto no Full App quanto no Sidepanel quando fizer sentido.

## Componentes em `src/shared/ui/`

- `badge.js`: renderiza badges semânticos com label, variante, attrs, data attrs e tooltip.
- `button.js`: renderiza botões textuais ou icon+text com variante, attrs, data attrs e suporte a tooltip para disabled.
- `checkbox.js`: renderiza checkbox visual customizado com wrapper `.ui-checkbox`.
- `count.js`: renderiza contagens textuais simples.
- `data-panel.js`: renderiza a estrutura header, filters, body, scroll, footer e overlay de painéis densos.
- `dom.js`: utilitários de HTML, attrs, classes, data attrs, delegação de eventos e guardas de atualização.
- `dropdown-menu.js`: renderiza menu baseado em `details/summary`.
- `empty-state.js`: renderiza estado vazio com mensagem e helper.
- `floating-selection-bar.js`: renderiza barra flutuante de seleção em massa.
- `form.js`: renderiza campos/linhas de formulário simples.
- `icon-button.js`: renderiza botão apenas com ícone e tooltip/ARIA.
- `import-template-menu.js`: especialização do dropdown para templates de importação.
- `log-detail.js`: modal compartilhado de detalhe de log.
- `modal-shell.js`: estrutura comum de modal com backdrop, header, body, footer e close.
- `pagination.js`: renderiza contagem e controles de paginação.
- `rule-status.js`: renderiza status de regra usando badge.
- `select.js`: renderiza select nativo mais menu customizado sincronizado.
- `toggle.js`: renderiza switch com label e status toggle compacto.
- `tooltip.js`: utilitários de tooltip.

## Primitivas visuais fora de `src/shared/ui/`

Também fazem parte da camada visual compartilhada, mesmo fora de `src/shared/ui/`:

- `src/shared/toast.js`: feedback curto global.
- `src/shared/dialogs.js`: confirmações, prompts e escolhas baseadas em modal shell.
- `src/shared/bulk-delete-dialog.js`: copy compartilhada para deleção em massa.
- `src/shared/base.css`: fundamentos globais e CSS atual de badge.

Não mover esses arquivos sem plano específico. A organização futura deve ser incremental.

## Botões

Quando precisar de uma nova intenção visual de botão:

- verifique se já existe variante semântica;
- se não existir e for reutilizável, adicione a variante no helper ou no padrão compartilhado;
- centralize o estilo no CSS correto;
- use a variante pelo helper;
- evite replace manual de CSS ou classe local para criar uma intenção reaproveitável.

Variantes reais de `.btn` no estado atual:

- base sem variante;
- `primary`;
- `secondary`;
- `danger`;
- `warning`;
- `info`;
- `ghost`.

Não há `.btn.neutral` no CSS atual. Quando a UI precisar de ação neutra, o estado atual usa o botão base sem variante ou `secondary`, dependendo do contexto.

## Badges

Badge já está mais centralizado que outros componentes e deve servir como referência.

Diretrizes:

- usar `renderBadge`;
- não recriar badge manualmente em cada tela;
- escolher variante por intenção semântica;
- se precisar de nova cor/estado reutilizável, adicionar variante centralizada;
- manter contraste e legibilidade.

Variantes reais em `src/shared/base.css`:

- `success`;
- `warning`;
- `danger`;
- `info`;
- `secondary`;
- `contrast`.

## Modal shell

Use `renderModalShell` quando possível.

Diretrizes:

- header, body e footer consistentes;
- footer com ações alinhadas à direita;
- close com label acessível;
- `Cancelar` e `Confirmar` como padrão para decisão;
- `danger` para ação destrutiva;
- evitar modal totalmente customizado sem necessidade.

## Toasts, dialogs e feedback

- Toast é feedback curto.
- Toast não substitui confirmação.
- Dialog/modal é usado para decisão.
- Ação destrutiva deve usar confirmação.
- Feedback global deve passar pelos helpers compartilhados quando aplicável.
- Cancelamento de modal não deve gerar toast de sucesso.

## CSS e responsabilidades

Direção desejada:

- CSS global deve conter apenas base, tokens, reset e fundamentos realmente compartilhados.
- CSS específico de feature/tela deve ficar na superfície correta.
- Variações reutilizáveis de componentes devem ser centralizadas.
- Não jogar CSS específico de feature em `base.css`.
- Não duplicar cores/variantes do mesmo conceito em vários arquivos.
- Se for necessário um CSS específico para componentes compartilhados, avaliar criar algo como `src/shared/ui/ui.css` ou equivalente.

Não afirmar que `base.css` é o lugar definitivo para componentes. Hoje ele é usado por Full App e Sidepanel, mas mistura fundamentos globais com badge e não cobre os demais helpers compartilhados.

## Relação entre documentações

- `docs/internal/ui/components.md`: componentes compartilhados, primitivas visuais, variantes e direção de CSS.
- `docs/internal/ai/ui-patterns.md`: padrões específicos do AI Bridge, modal global de propostas, permissões e copy.
- `docs/internal/ai/architecture.md`: arquitetura técnica do AI Bridge/MCP.
- `docs/plans/`: planos temporários/históricos, não documentação final.
