# MockPilot Improvements Roadmap

## Etapa 1 — Redesign estrutural e Full App básico

> Status: **finalizada**

Objetivo: reorganizar o MockPilot para separar melhor o uso rápido no sidepanel do gerenciamento avançado no Full App.

### Escopo

- Reorganização da estrutura de pastas.
- Criação de uma base visual mais limpa e consistente.
- Sidepanel compacto, mas ainda operacional.
- Full App em nova aba da extensão.
- Collections como agrupamento genérico de rules.
- Sincronização entre sidepanel, Full App e background.
- Storage como fonte persistente.
- Runtime state separado do estado persistido.

### Sidepanel

O sidepanel deve permitir:

- Attach / Reattach / Detach.
- Reload da aba atual.
- Selecionar Collection ativa.
- Ativar/desativar Collection ativa.
- Visualizar rules da Collection ativa.
- Ativar/desativar rules rapidamente.
- Criar rule simples.
- Editar rule simples.
- Criar rule simples a partir de uma request capturada.
- Ver logs recentes.
- Abrir o Full App no contexto correto.

O sidepanel não deve concentrar:

- Headers avançados.
- Diagnóstico completo.
- Import/export avançado.
- Cenários complexos.
- Bulk actions.
- Configuração pesada de prioridade/conflitos.

### Full App

O Full App deve centralizar fluxos avançados:

- Dashboard.
- Rules.
- Collections.
- Network.
- Logs.
- Import / Export.
- Diagnostics.
- Settings.

### Critérios de aceite

- Sidepanel não possui mais formulário gigante.
- Sidepanel permite quick create/edit de rule.
- Full App abre em nova aba da extensão.
- Full App permite gerenciamento completo de Collections e Rules.
- Alterações feitas no Full App refletem no sidepanel.
- Alterações feitas no sidepanel refletem no Full App.
- Background continua interceptando mesmo com sidepanel fechado.
- Defaults seguros são mantidos:
  - `applyResponseBody: true`
  - `applyResponseHeaders: false`

### Entregas já implementadas (Etapa 1 concluída)

- Full App funcional com navegação por páginas:
  - Dashboard
  - Regras
  - Coleções
  - Rede
  - Logs
  - Importar / Exportar
  - Diagnóstico
  - Configurações
- Sidepanel e Full App sincronizados via estado central no background.
- Criação/edição rápida de rules no sidepanel + editor avançado no Full App.
- Criação de rule a partir de request capturada.
- i18n ativo em Sidepanel e Full App:
  - English
  - Português
  - Español
- Melhorias de UX no topo (side e full):
  - Status no formato `Anexado à aba X`
  - Nome da aba clicável para focar a aba/janela
- Network (side/full):
  - Filtro de entradas incompletas/fantasmas (sem método e sem URL)
  - Organização de layout com separação clara de filtros e dados
- Logs:
  - Captura de logs internos (`scope: app`)
  - Captura de logs da página web via CDP Runtime (`scope: web`)
  - Filtro por escopo (`Todos`, `App`, `Web`) no sidepanel e Full App
- Mock response:
  - Correção de headers/CORS para reduzir falhas de regra que fazia match mas quebrava no frontend
- Auto-attach:
  - Reanexo automático ao trocar para outra aba HTTP(S) quando a opção está ativa
- UX de attach com auto-attach (Full App + Sidepanel):
  - Com auto-attach desligado: fluxo manual (`Anexar/Reanexar`, `Desanexar`, `Recarregar`)
  - Com auto-attach ligado: estado claro de auto-attach ativo
  - `Recarregar` mantido como ação principal
  - Ações manuais movidas para menu secundário (`Desativar auto-attach`, `Desanexar agora`)
  - Toast informativo ao desanexar manualmente com auto-attach ligado
  - i18n atualizado para os novos textos de attach
- Versão atualizada para `0.4.0`.

---

## Etapa 2 — Polimento visual e usabilidade do Sidepanel

Objetivo: melhorar a experiência diária do sidepanel, deixando a interface mais clara, menos apertada e mais fácil de operar.

### 2.1 Rules Actions Layout Cleanup

Reorganizar as ações dentro dos cards/rows de rule.

Escopo:

- Melhorar scanability das rules.
- Separar ações primárias, secundárias e destrutivas.
- Evitar botões espremidos.
- Usar overflow/menu para ações menos usadas.
- Manter badges e ações visualmente separados.
- Alinhar os cards de forma consistente.

Ações sugeridas:

- Primárias:
  - Edit
  - Enable/Disable
- Secundárias:
  - Duplicate
  - Advanced
  - Export
- Destrutiva:
  - Delete

### 2.2 Header Actions Consistency

Padronizar os headers de cards, painéis e seções.

Escopo:

- Espaçamento consistente.
- Botões com tamanho confortável.
- Alinhamento uniforme.
- Menos ações competindo na mesma linha.
- Uso de menus quando houver muitas opções.

### 2.5 i18n / Localização

Objetivo: preparar o MockPilot para múltiplos idiomas sem espalhar textos hardcoded pela UI.

Idiomas iniciais:

- English
- Português
- Español

Idioma padrão recomendado:

- English

Fallback:

- English

Escopo:

- Criar módulo central de i18n.
- Remover textos hardcoded do Sidepanel e Full App.
- Adicionar seletor de idioma em Settings.
- Persistir idioma escolhido em `chrome.storage.local`.
- Aplicar idioma no Sidepanel e Full App.
- Usar fallback quando uma chave não existir.
- Manter labels, botões, placeholders, empty states, mensagens de erro e badges traduzíveis.

Fora de escopo nesta etapa:

- Tradução automática.
- Pluralização avançada.
- Formatação complexa de datas/números.
- Tradução de conteúdo importado/exportado pelo usuário.

Critérios de aceite:

- Usuário consegue alternar entre English, Português e Español.
- Sidepanel atualiza os textos conforme o idioma selecionado.
- Full App atualiza os textos conforme o idioma selecionado.
- Idioma escolhido persiste ao fechar/reabrir a extensão.
- Textos novos passam a usar o módulo de i18n.
- Quando uma chave está ausente, o app usa fallback em inglês.

### Critérios de aceite

- Nenhum card de rule parece visualmente poluído.
- Delete não fica próximo demais das ações comuns.
- Headers seguem um padrão visual único.
- Botões não ficam espremidos em larguras menores.
- A interface fica mais coesa entre Rules, Network e Logs.

---

## Etapa 3 — Rule Hit Counter e Live State

Objetivo: deixar claro quais rules estão sendo usadas de verdade durante a navegação/teste.

### Escopo

- Mostrar `applied N times` por rule.
- Mostrar `last matched`.
- Melhorar os estados visuais das rules:
  - `matching`
  - `not matching`
  - `inactive`
  - `error`
  - `conflict`
- Destacar rules aplicadas recentemente.
- Exibir estado tanto no sidepanel quanto no Full App.

### Critérios de aceite

- Cada rule mostra quantas vezes foi aplicada.
- O usuário consegue identificar rapidamente quais mocks estão ativos e sendo usados.
- O estado visual não depende apenas de cor.
- O contador é atualizado sem precisar recarregar a interface.

---

## Etapa 4 — Rule Presets / Quick Scenarios

Objetivo: acelerar a criação de mocks comuns para loops rápidos de QA/dev.

### Presets iniciais

- Success 200.
- Unauthorized 401.
- Forbidden 403.
- Rate limited 429.
- Server error 500.
- Timeout.
- Offline / failed request.
- Empty list.
- Empty object.

### Onde aplicar

- Quick create rule no sidepanel.
- Create rule from request.
- Advanced editor no Full App.

### Critérios de aceite

- Usuário consegue criar uma rule comum com poucos cliques.
- Presets geram status/action/body coerentes.
- Presets não sobrescrevem campos editados sem confirmação.
- Presets funcionam no sidepanel e no Full App.

---

## Etapa 5 — Persistência de filtros do Network

Objetivo: evitar fricção ao reabrir a extensão ou alternar entre telas.

### Escopo

Persistir filtros como:

- Texto pesquisado.
- Termos ocultos/excluídos.
- Method.
- Status.
- Resource type.
- `matched only`.
- `intercepted only`.
- `errors only`.

### Critérios de aceite

- Filtros são restaurados ao reabrir o sidepanel.
- Filtros são restaurados ao abrir o Full App.
- Atualizações live do Network não removem foco dos inputs.
- O usuário consegue limpar todos os filtros facilmente.

---

## Etapa 6 — Import/Export Bundle

Objetivo: permitir compartilhamento e backup de conjuntos completos de mocks.

### Escopo

- Exportar uma rule individual.
- Exportar uma Collection.
- Exportar todos os dados.
- Importar bundle.
- Preview antes de importar.
- Estratégias de conflito:
  - Create copies.
  - Replace existing.
  - Merge by id.

### Critérios de aceite

- Usuário consegue exportar uma Collection inteira.
- Usuário consegue importar um bundle sem sobrescrever dados acidentalmente.
- Import mostra preview antes de aplicar.
- Conflitos são claramente exibidos.

---

## Etapa 7 — Rich Network Inspector

Objetivo: transformar o Network em um inspector mais útil para debug e criação de mocks.

### Escopo

Ao clicar em uma request, abrir um painel detalhado com:

- Overview da request.
- Method.
- URL.
- Status.
- Duration.
- Resource type.
- Matched rule.
- Applied action.
- Query params em tabela.
- Request headers.
- Request payload/body.
- Response headers.
- Response body preview.
- Timing.
- Error details quando houver falha.

### Ações rápidas

- Create rule from this request.
- Copy as fetch.
- Copy cURL.
- Replay.

> Observação: `Replay` pode ficar para uma subetapa própria se aumentar muito a complexidade.

### Critérios de aceite

- Clicar em uma request sempre abre detalhes básicos.
- Headers são visualizáveis e copiáveis.
- Query params aparecem em formato legível.
- JSON válido é exibido formatado.
- Conteúdo não JSON continua visível como texto bruto.
- O inspector continua aberto enquanto novas requests chegam.
- Filtros não perdem foco com atualizações live.

---

## Etapa 8 — Attach Diagnostics Panel

Objetivo: facilitar diagnóstico de problemas de attach, debugger e CDP.

### Escopo

- Mostrar status atual do attach.
- Mostrar aba atual anexada.
- Mostrar URL anexada.
- Mostrar última tentativa de attach.
- Mostrar último erro de attach.
- Mostrar estratégia usada:
  - `tabId`
  - `targetId`
- Mostrar status de:
  - Network enabled.
  - Fetch enabled.
  - Runtime listener ativo.
- Exibir eventos recentes relacionados ao attach.

### Critérios de aceite

- Usuário consegue entender por que a extensão não está interceptando.
- Erros de attach aparecem de forma clara.
- Informações de diagnóstico não poluem o sidepanel.
- Diagnóstico avançado fica no Full App.

---

## Etapa 9 — One-Rule Mode

Objetivo: reduzir conflitos e melhorar previsibilidade durante testes específicos.

### Escopo

- Adicionar modo opcional para manter apenas uma rule ativa por vez.
- Ao ativar uma rule, desativar automaticamente as outras da mesma Collection.
- Indicar claramente quando o modo está ativo.
- Permitir ligar/desligar o modo nas configurações.

### Critérios de aceite

- One-Rule Mode pode ser ativado/desativado.
- Quando ativo, apenas uma rule fica enabled na Collection atual.
- A UI informa que outras rules foram desativadas.
- O comportamento é previsível e reversível.

---

## Etapa 10 — Auto-attach para testes com múltiplas abas/branches

Objetivo: facilitar uso em ambientes com muitas URLs de preview, staging ou localhost.

> Status: **parcialmente implementado**

### Escopo

- Auto-attach opcional na aba HTTP(S) ativa.
- Detach seguro da aba anterior ao trocar de alvo.
- Status claro indicando que auto-attach está ativo.
- Host filter opcional.
- Lista de hosts permitidos.

Exemplos genéricos de host filter:

- `localhost:*`
- `*.vercel.app`
- `*.netlify.app`
- `*.staging.example.com`

### Critérios de aceite

- Auto-attach é opt-in.
- Extensão não anexa em sites aleatórios sem configuração clara.
- Usuário consegue limitar por host.
- Troca de aba não deixa estado inconsistente.
- UI mostra claramente qual aba está anexada.

Status atual:

- Implementado:
  - Auto-attach opt-in
  - Reanexo ao trocar de aba HTTP(S)
  - Indicação clara da aba anexada na UI
- Pendente:
  - Host filter
  - Lista de hosts permitidos

---

## Etapa 11 — Host / Project Profiles

Objetivo: permitir configurações diferentes por contexto de trabalho.

### Escopo

- Criar perfis por host/projeto.
- Associar Collections a um profile.
- Salvar preferências de attach por profile.
- Alternar rapidamente entre profiles.
- Futuramente permitir import/export por profile.

Exemplos genéricos:

- Localhost.
- Staging.
- Preview branches.
- Production-like.
- Client project.

### Critérios de aceite

- Usuário consegue criar e alternar profiles.
- Profiles não acoplam o produto a nenhum domínio específico.
- Configurações de um profile não vazam para outro.
- Profiles ajudam a organizar ambientes diferentes.

---

## Etapa 12 — Auto-dismiss Notice Modals

Objetivo: melhorar pequenos feedbacks sem atrapalhar o fluxo.

### Escopo

- Auto-close para notices informativos.
- Timeout opcional entre 2.5s e 4s.
- Manter confirmações persistentes.
- Pausar timeout em hover/focus.
- Manter suporte a fechamento manual e teclado.

### Critérios de aceite

- Mensagens informativas somem automaticamente.
- Confirmações destrutivas nunca fecham sozinhas.
- Usuário ainda consegue fechar manualmente.
- Comportamento continua acessível por teclado.

---

# Priorização resumida

## Em andamento

1. Etapa 2 — Polimento visual e usabilidade do Sidepanel.

## Próximas etapas recomendadas

2. Rule Hit Counter e Live State.
3. Rule Presets / Quick Scenarios.
4. Persistência de filtros do Network.
5. Import/Export Bundle. **(solicitar prompt detalhado)**

## Etapas maiores

7. Rich Network Inspector. **(solicitar prompt detalhado)**
8. Attach Diagnostics Panel. **(solicitar prompt detalhado)**
9. One-Rule Mode. **(solicitar prompt detalhado)**
10. Auto-attach. **(solicitar prompt detalhado)**
11. Host / Project Profiles. **(solicitar prompt detalhado)**

## Polimento final

12. Auto-dismiss Notice Modals.
