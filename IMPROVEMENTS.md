# InterceptPilot Improvements Roadmap

Este roadmap lista apenas melhorias ainda pendentes, parciais ou que precisam de decisão futura.

Itens já entregues devem ficar documentados em `docs/releases/`, `docs/internal/ai/` ou nos planos de execução correspondentes, não neste arquivo.

## 1. Segurança e privacidade

Objetivo: reduzir risco de vazamento de dados sensíveis em inspeção, cópia e exportação.

Escopo pendente:

- Mascarar `Authorization`, `Cookie` e `Set-Cookie` por padrão em cURL/fetch.
- Opção explícita para copiar headers sensíveis.
- Avisos em exportações que contenham payloads ou headers sensíveis.
- Limpeza/sanitização de dados sensíveis.
- Modo local-only/privado explicado de forma clara.
- Política de sanitização para requests expostas a integrações locais e AI Bridge.
- Política explícita para URLs privadas e payloads sensíveis.

Critérios de aceite:

- Dados sensíveis não aparecem em cópias/exportações sem intenção clara.
- O usuário entende quando está copiando informação sensível.
- Sanitização é consistente entre Full App e Sidepanel quando aplicável.
- Integrações locais seguem a mesma política antes de ler ou importar dados.

## 2. Preview e estratégias avançadas de importação

Objetivo: reduzir risco ao importar bundles maiores, dados vindos de outra instalação ou sugestões produzidas por agentes locais.

Escopo pendente:

- Preview antes de aplicar a importação.
- Diferença visual entre criação, atualização e conflito.
- Estratégia `merge by id` para coleções/regras.
- Resumo de impacto antes da confirmação.
- Possível dry-run interno reaproveitando o parser/validador atual.
- Importação de bundle JSON sugerido por IA apenas com confirmação explícita na UI.

Critérios de aceite:

- O usuário entende o que será criado, atualizado ou ignorado antes de confirmar.
- Conflitos ficam claros.
- O fluxo continua aceitando colagem manual, seleção de arquivo e drag-and-drop.
- O parser/validador atual continua sendo a fonte de verdade.
- Importações vindas do AI Bridge passam pelo mesmo preview e pela mesma confirmação visual.

## 3. Filtros avançados da Network

Objetivo: evoluir os filtros atuais sem perder a estabilidade de foco e clique durante atualizações em tempo real.

Escopo pendente:

- Filtro por resource type.
- Filtro por requests com regra aplicada.
- Filtro por erros/falhas.
- Ação clara para limpar todos os filtros.
- Persistência dos novos filtros em Full App e Sidepanel, se fizer sentido para ambos.

Critérios de aceite:

- Filtros são restaurados ao reabrir Full App e Sidepanel.
- Atualizações em tempo real não removem foco dos inputs.
- A lista continua abrindo o item correto por ID estável.
- PT, EN e ES cobrem todos os novos textos.

## 4. Response e Media Preview

Objetivo: melhorar o Network Inspector para exibir previews seguros de responses.

Escopo pendente:

- Preview de `image/png`, `image/jpeg`, `image/webp` e `image/svg+xml`.
- Preview de JSON formatado.
- Preview de `text/html`, `text/plain`, CSS e JavaScript como texto.
- Preview de blob/base64 quando viável.
- Download/copy do body.
- Fallback claro para preview indisponível.

Cuidados:

- Bodies podem ser grandes, binários ou sensíveis.
- Captura leve pode não ter todos os bodies.
- Captura completa pode depender de `Network.getResponseBody`.
- SVG deve ser renderizado com cuidado por segurança.

Critérios de aceite:

- Preview nunca quebra o inspector quando o body é grande ou inválido.
- O usuário entende quando um preview não está disponível.
- Copiar/download continua disponível quando fizer sentido.
- Conteúdo potencialmente perigoso é tratado de forma segura.

## 5. Browser Storage Inspector

Objetivo: visualizar e gerenciar dados de armazenamento da página capturada pelo Full App.

Escopo pendente:

- Visualizar `localStorage`.
- Visualizar `sessionStorage`.
- Avaliar cookies, `IndexedDB` e Cache Storage.
- Separar dados por aba/origin.
- Busca/filtro em tabela.
- Copiar, editar e deletar valores.
- Limpar storage do origin com confirmação.
- Export/import de storage.

Cuidados:

- Avaliar permissões necessárias antes de qualquer implementação.
- Não misturar dados de origins diferentes.
- Tratar dados sensíveis com mascaramento e confirmação.
- Diferenciar aba capturada de aba ativa.
- Evitar alterações destrutivas sem confirmação explícita.

Critérios de aceite:

- O usuário vê claramente de qual origin os dados vieram.
- Ações destrutivas pedem confirmação.
- Dados sensíveis não são expostos/exportados sem aviso.
- Nenhuma permissão nova entra sem decisão documentada.

## 6. One-Rule Mode

Objetivo: reduzir conflitos durante testes específicos mantendo apenas uma regra ativa por vez dentro da coleção.

Escopo pendente:

- Configuração opt-in.
- Ao ativar uma regra, desativar automaticamente as outras da mesma coleção.
- Indicação visual clara quando o modo está ativo.
- Mensagem explicando quais regras foram desativadas.

Critérios de aceite:

- O modo pode ser ativado/desativado.
- O comportamento é reversível e previsível.
- A UI não depende só de cor para explicar o estado.
- Full App e Sidepanel refletem a mesma regra ativa.

## 7. Request Builder / API Client

Objetivo: adicionar uma área semelhante a Insomnia/Postman para montar, enviar e salvar requisições dentro do InterceptPilot.

Escopo pendente:

- Criar requisições manuais com método, URL, headers, query params e body.
- Enviar requisições a partir do Full App.
- Salvar requisições em coleções próprias ou associadas às coleções existentes.
- Reaproveitar uma request capturada como base para uma request salva.
- Organizar requests por coleção, ambiente ou projeto.
- Histórico de execuções locais.
- Copiar como fetch/cURL a partir da request montada.
- Avaliar variáveis de ambiente em etapa futura.

Cuidados:

- Não confundir requests salvas com regras de interceptação.
- Evitar enviar dados sensíveis sem confirmação visual clara.
- Definir se requests manuais devem ou não passar pelo próprio InterceptPilot.
- Não transformar a extensão em backend/proxy local sem decisão explícita.

Critérios de aceite:

- O usuário consegue montar e executar uma request sem sair do Full App.
- Requests salvas são fáceis de diferenciar de regras.
- Coleções continuam claras e não ficam sobrecarregadas.
- Headers e payloads sensíveis recebem tratamento consistente com o resto do produto.

## 8. Replay de requests no Network Inspector

Objetivo: permitir repetir uma request capturada de forma controlada para comparar resposta original e nova resposta.

Escopo pendente:

- Ação `Replay` no inspector.
- Confirmação quando a request tiver método ou body potencialmente destrutivo.
- Exibição do resultado do replay sem substituir a entrada original.
- Indicação clara se o replay passou por regra, mock ou pass-through.

Critérios de aceite:

- Replay não altera regra, coleção, hit state ou captura sem intenção explícita.
- O usuário consegue comparar original e replay.
- Erros de replay são visíveis e copiáveis.
- A ação é segura por padrão.

## 9. Melhorias nos modos de captura

Objetivo: melhorar previsibilidade e compatibilidade da Captura completa, Captura leve e modo Automático.

Escopo pendente:

- Captura leve com XMLHttpRequest além de `fetch`.
- Fallback Automático mais refinado.
- Detecção melhor de conflito com DevTools ou outras extensões.
- Explicação mais clara das limitações da Captura leve.
- Compatibilidade com ferramentas/extensões que também mexem no runtime da página.
- Reduzir dependência do banner de debugger quando o modo leve for suficiente.

Cuidados:

- Não prometer paridade total entre Captura leve e Captura completa.
- XHR pode ter timing e payloads diferentes de `fetch`.
- Monkey patching de terceiros pode interferir.
- Timing de injeção de script precisa ser validado com cuidado.

Critérios de aceite:

- O usuário entende qual modo está ativo e por quê.
- Captura leve continua mais compatível.
- Captura completa continua oferecendo maior cobertura.
- Não há alteração de permissões sem aprovação explícita.

## 10. Captura em segundo plano e notificações de regra

Objetivo: deixar mais explícito e confiável o comportamento de captura quando Sidepanel e Full App estão fechados, com feedback discreto quando uma regra é aplicada.

Estado atual:

- O background já mantém a interceptação rodando mesmo com Sidepanel e Full App fechados.
- A melhoria pendente é tornar isso mais visível, auditável e fácil de confiar durante uso real.

Escopo pendente:

- Validar e documentar o comportamento de captura ativa com as UIs fechadas.
- Mostrar feedback discreto quando uma regra for aplicada.
- Avaliar popup/top-right, notificação do navegador ou outro canal de baixo ruído.
- Permitir ligar/desligar esse feedback.
- Evitar notificações repetitivas em requests muito frequentes.
- Agregar eventos quando várias regras forem aplicadas em sequência.

Cuidados:

- Notificações do navegador podem exigir permissão nova.
- Feedback visual não deve interromper captura ativa.
- Evitar expor URLs, tokens ou payloads sensíveis em notificações.
- Não alterar runtime/capture, rule engine ou hit state sem plano específico.

Critérios de aceite:

- O usuário consegue confiar que a captura continua ativa sem a UI aberta.
- Aplicações de regra podem ser percebidas sem abrir o Full App.
- O feedback é discreto e configurável.
- Não há spam visual em páginas com muitas requests.

## 11. Filtro de hosts para captura automática

Objetivo: tornar a captura automática mais segura e previsível em ambientes com várias abas, branches e hosts.

Escopo pendente:

- Lista de hosts permitidos.
- Suporte a padrões como `localhost:*` e subdomínios.
- UI para adicionar/remover hosts.
- Explicação clara quando a aba atual não passa no filtro.

Critérios de aceite:

- Captura automática continua opt-in.
- A extensão não captura hosts fora da lista quando o filtro estiver ativo.
- O usuário entende por que uma aba foi ignorada.
- Chrome e Edge seguem o mesmo comportamento.

## 12. Confiabilidade de estado da regra

Objetivo: revisar cenários difíceis em que uma regra acionada pode perder ou resetar estado visual de forma confusa.

Escopo pendente:

- Investigar reset por ciclo real da aba capturada.
- Evitar reset por troca de aba, Full App, `extension://` ou páginas internas do navegador.
- Melhorar logs de diagnóstico para resets de matched state.
- Avaliar `cycleId` da aba capturada como referência de reset.

Cuidados:

- Não alterar hit state ou rule engine sem plano específico.
- Não retomar tentativas antigas sem logs direcionados.
- Preservar diferença entre runtime state e estado persistido.

Critérios de aceite:

- Estado visual só reseta quando fizer sentido para o ciclo da aba capturada.
- Logs explicam por que um reset aconteceu.
- Full App e Sidepanel exibem o mesmo estado.

## 13. Host / Project Profiles

Objetivo: separar configurações por projeto, cliente, host ou ambiente de teste.

Escopo pendente:

- Criar e alternar perfis.
- Associar coleções a um perfil.
- Salvar preferências de captura por perfil.
- Futuramente permitir import/export por perfil.

Exemplos de perfil:

- Localhost.
- Staging.
- Preview branches.
- Production-like.
- Client project.

Critérios de aceite:

- Configurações de um perfil não vazam para outro.
- Alternar perfil atualiza o contexto de trabalho de forma clara.
- Perfis não acoplam o produto a domínios específicos.

## 14. Diagnóstico avançado de captura

Objetivo: aprofundar o diagnóstico sem poluir Sidepanel ou telas operacionais.

Escopo pendente:

- Última tentativa de captura.
- Último erro de captura.
- Estratégia usada para captura.
- Estado dos domínios de captura quando aplicável.
- Exportação de snapshot de diagnóstico sanitizado.

Critérios de aceite:

- O usuário consegue entender por que a captura não está funcionando.
- Dados sensíveis são mascarados no snapshot.
- Diagnóstico avançado fica no Full App.
- Nenhuma permissão nova é adicionada sem aprovação explícita.

## 15. Session Report / Recording

Objetivo: avaliar uma feature de relatório de sessão para debug e bug report.

Escopo pendente:

- Capturar network, logs e regras aplicadas.
- Avaliar gravação curta de vídeo.
- Gerar HTML offline com timeline e contexto.
- Exportar sem depender de servidor no MVP.

Cuidados:

- Permissões de gravação.
- Privacidade e dados sensíveis.
- Tamanho do arquivo.
- Não virar um clone completo de ferramentas de bug report.

Critérios de aceite:

- O relatório é útil offline.
- Dados sensíveis são mascarados ou exigem confirmação.
- O usuário controla quando grava e exporta.

## 16. Data Tables / Advanced Lists

Objetivo: evoluir listas densas sem criar abstração pesada cedo demais.

Escopo pendente:

- Virtualização simples para listas grandes.
- Sorting por colunas.
- Resize de colunas.
- Busca avançada.
- Agrupamento por ciclo/reload.
- Agrupamento por domain/status/rule.

Cuidados:

- Preservar performance.
- Manter Sidepanel compacto.
- Não quebrar o padrão Data Panel do Full App.
- Não perder estabilidade de clique durante atualizações em tempo real.

Critérios de aceite:

- Listas grandes continuam responsivas.
- Ações e detalhes seguem baseados em IDs estáveis.
- Layout continua alinhado com scrollbars e action columns.
- A correção de clique em Network/Logs durante atualizações em tempo real continua coberta por teste e validação manual quando o layout dessas listas mudar.

## 17. Remodelagem visual, tema light/dark e branding

Objetivo: remodelar visualmente o InterceptPilot, definir tema claro/escuro de forma consistente e evoluir a identidade do produto.

Escopo pendente:

- Remodelagem visual do Full App e Sidepanel preservando densidade operacional.
- Paleta oficial.
- Tema claro e tema escuro bem definidos.
- Tokens CSS revisados.
- Cor primária e estados danger/warning/info/success.
- Borda de foco dos inputs e controles mais discreta, mantendo acessibilidade.
- Estados hover/focus/active mais consistentes.
- Ícones e logo.
- Splash/onboarding visual, se houver.
- Consistência entre Sidepanel e Full App.
- Avaliar relação com LayoutPilot e eventual marca guarda-chuva.

Critérios de aceite:

- A UI continua funcional e densa, sem virar landing page.
- Tokens facilitam evolução sem refactor visual grande.
- Sidepanel e Full App parecem parte do mesmo produto.
- Focus ring continua visível para teclado, mas menos pesado visualmente.

## 18. Auto-dismiss para notice modals

Objetivo: melhorar avisos informativos sem atrapalhar o fluxo.

Escopo pendente:

- Auto-close opcional para notices informativos.
- Timeout entre 2.5s e 4s.
- Pausar timeout em hover/focus.
- Manter confirmações persistentes.
- Manter fechamento manual e teclado.

Critérios de aceite:

- Mensagens informativas somem automaticamente quando apropriado.
- Confirmações destrutivas nunca fecham sozinhas.
- O comportamento continua acessível por teclado.

## 19. Organização futura de regras

Objetivo: complementar a organização de regras sem sobrecarregar a tela principal.

Escopo pendente:

- Avaliar ação por linha para mover regra, se a barra de seleção em massa não for suficiente.
- Aviso opcional para nomes duplicados ou regras muito parecidas na coleção destino.
- Opção de trocar para a coleção destino depois de mover regras.
- Ordenação manual ou por prioridade, se virar necessidade real.

Critérios de aceite:

- A tela de Regras permanece densa e escaneável.
- Ações novas não competem com editar, duplicar, exportar, excluir e avançado.
- Full App e Sidepanel continuam sincronizados.

## 20. Organização de i18n por domínio e fluxo

Objetivo: melhorar a manutenção dos textos traduzidos, separando textos por domínio, feature ou fluxo quando eles pertencem a uma área específica do produto.

Contexto:

- Fluxos recentes como AI Bridge, proposal modal, importação assistida, ações de regra, deleção, reload e permissões adicionam várias chaves relacionadas entre si.
- Hoje essas chaves tendem a ficar flat no mesmo bloco, por exemplo `aiImportCollectionLead`, `aiImportRuleLead`, `aiActionProposalTitle`, `aiActionTypeDeleteCollection` e `aiActionReloadTarget`.
- O modelo atual funciona, mas dificulta identificar todos os textos de uma feature e mistura textos globais, textos de tela, modal, toast, ação e importação no mesmo nível.

Escopo pendente:

- Avaliar uma organização aninhada por domínio/fluxo, por exemplo `fullapp.aiBridge.proposalModal.import.ruleLead`.
- Deixar globais apenas textos realmente reutilizados em várias telas, como `Cancelar`, `Confirmar`, `Excluir`, `Salvar`, `Editar` e `Desconhecido`.
- Agrupar textos específicos dentro do domínio da feature ou fluxo.
- Manter paridade entre PT-BR, EN e ES.
- Garantir que o helper `t()` continue simples de usar com paths aninhados.
- Avaliar migração incremental para não refatorar todos os locales de uma vez.
- Começar por fluxos novos ou mais isolados, como AI Bridge Proposal Modal.
- Evitar quebrar chaves existentes sem necessidade; se migrar, fazer por etapas com testes.

Exemplo de direção:

```js
fullapp: {
  aiBridge: {
    page: {
      title: 'AI Bridge',
      description: '...'
    },
    proposalModal: {
      source: 'AI Bridge',
      import: {
        ruleLead: 'Importar a regra “{name}”.',
        collectionLead: 'Importar a coleção “{name}”.',
        collectionRuleImpact: 'Isso adicionará {count} regras.'
      },
      action: {
        title: 'Ação proposta pela IA',
        confirm: 'Confirmar'
      },
      delete: {
        collectionLead: 'Excluir “{name}” também removerá {count} regras desta coleção.',
        warning: 'Esta ação não pode ser desfeita.'
      },
      reload: {
        lead: 'Recarregar a aba capturada.',
        target: 'Aba: {target}'
      }
    }
  }
}
```

Critérios de aceite:

- Textos de fluxos específicos ficam agrupados por domínio.
- Chaves globais ficam reservadas para textos realmente compartilhados.
- Fica fácil identificar todos os textos usados por uma feature.
- Locale parity continua coberta por teste.
- Nenhuma chave crua aparece na UI.
- A migração não altera comportamento visual além da organização interna.

## 21. Organizar CSS dos componentes compartilhados

Objetivo: deixar clara a responsabilidade entre CSS global/base, CSS de componentes compartilhados e CSS específico de features ou superfícies.

Contexto:

- `src/shared/base.css` é carregado no Full App e no Sidepanel, mas hoje mistura fundamentos globais com estilos de badge.
- Helpers em `src/shared/ui/` como button, toggle, select, modal shell, data panel, dropdown, empty state e floating selection bar não têm um CSS compartilhado único.
- Há duplicação de estilos e variantes entre `src/fullapp/fullapp.css` e `src/sidepanel/sidepanel.css`.

Direção preferida:

- Evitar um único `shared.css` gigante para todos os componentes.
- Avaliar uma estrutura por componente ou grupo dentro de `src/shared/ui/styles/`.
- Manter `src/shared/base.css` focado em tokens globais, variáveis globais, reset/base, scrollbar, regras realmente globais e fundamentos compartilhados por todas as superfícies.
- Concentrar estilos reutilizáveis de componentes em arquivos como `button.css`, `badge.css`, `modal-shell.css`, `toggle.css`, `select.css`, `toast.css`, `dialogs.css` e `data-panel.css`.
- Avaliar um agregador `src/shared/ui/styles/index.css` para importar os CSS compartilhados por componente.
- Avaliar se `@import` funciona bem no contexto da extensão, CSP e caminhos atuais. Se não for ideal, considerar múltiplos `<link>` explícitos no Full App e Sidepanel.

Exemplo de direção:

```txt
src/shared/base.css
src/shared/ui/styles/index.css
src/shared/ui/styles/button.css
src/shared/ui/styles/badge.css
src/shared/ui/styles/modal-shell.css
src/shared/ui/styles/toggle.css
src/shared/ui/styles/select.css
src/shared/ui/styles/toast.css
src/shared/ui/styles/dialogs.css
src/shared/ui/styles/data-panel.css
```

Escopo pendente:

- Investigar se `src/shared/base.css` deve ficar restrito a fundamentos globais.
- Decidir a estrutura final de `src/shared/ui/styles/`.
- Avaliar `src/shared/ui/styles/index.css` como agregador.
- Centralizar variantes reutilizáveis de button, badge, toggle, select, modal, toast, dialogs e data panel.
- Evitar replace manual de CSS para criar variações reutilizáveis.
- Preservar estilos específicos de tela/feature nos CSS das respectivas superfícies.
- Migrar incrementalmente sem quebrar Full App e Sidepanel.
- Adicionar testes ou validações visuais quando possível.

Critérios de aceite:

- Cada componente compartilhado tem responsabilidade clara.
- Variantes visuais são semânticas.
- `base.css` fica restrito a fundamentos globais.
- Estilos compartilhados de componentes ficam em `src/shared/ui/styles/`.
- Componentes reutilizáveis possuem CSS centralizado por componente ou grupo.
- Full App e Sidepanel importam a mesma base compartilhada quando aplicável.
- CSS de feature não duplica variante global.
- Novas variantes visuais são adicionadas de forma semântica no componente/shared UI.
- A migração é incremental e validada nas duas superfícies.

## Priorização recomendada

1. Segurança e privacidade.
2. Preview e estratégias avançadas de importação.
3. Filtros avançados da Network.
4. Response e Media Preview.
5. Browser Storage Inspector.
6. One-Rule Mode.
7. Request Builder / API Client.
8. Replay de requests no Network Inspector.
9. Captura em segundo plano e notificações de regra.
10. Filtro de hosts para captura automática.
11. Diagnóstico avançado de captura.
12. Melhorias nos modos de captura.
13. Data Tables / Advanced Lists.
14. Host / Project Profiles.
15. Confiabilidade de estado da regra.
16. Session Report / Recording.
17. Remodelagem visual, tema light/dark e branding.
18. Organização futura de regras.
19. Auto-dismiss para notice modals.
20. Organização de i18n por domínio e fluxo.
21. Organizar CSS dos componentes compartilhados.

## Referências históricas

- `docs/internal/plans/interceptpilot-future-ideas.md`: origem de parte das ideias consolidadas aqui.
- `docs/plans/`: planos de execução e investigações específicas.
- `docs/releases/`: entregas já publicáveis ou planejadas por versão.
