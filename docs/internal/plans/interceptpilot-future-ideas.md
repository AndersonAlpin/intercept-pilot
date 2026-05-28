# InterceptPilot Future Ideas

## 1. Objetivo

Este documento lista ideias futuras para avaliacao. Ele nao representa tarefas aprovadas para implementacao imediata, nem deve ser usado como escopo ativo de desenvolvimento.

A intencao e manter um backlog leve de possibilidades para estudar depois, separado da rodada atual de refatoracao, polimento de UI e ajustes de captura.

## 2. Storage / Browser State Inspector

Ideia:

Incluir visualizacao e gerenciamento de dados de armazenamento da pagina no Full App.

Itens para estudar:

- localStorage;
- sessionStorage;
- cookies, se for viavel/permissivel;
- IndexedDB, se for viavel;
- Cache Storage, se for viavel;
- storage por aba/origin;
- visualizacao em tabela;
- busca/filtro;
- copiar valor;
- editar valor;
- deletar item;
- limpar storage do origin;
- export/import de storage.

Cuidados:

- permissoes necessarias;
- seguranca e privacidade;
- dados sensiveis;
- diferencas entre aba capturada e aba ativa;
- cross-origin;
- nao misturar storage de paginas diferentes;
- evitar alterar dados sem confirmacao.

## 3. Response Preview / Media Preview

Ideia:

Melhorar o Network Inspector para exibir previews quando o response for imagem ou outros tipos suportados.

Itens para estudar:

- preview de image/png, image/jpeg, image/webp, image/svg+xml;
- preview de JSON formatado;
- preview de text/html/text/plain;
- preview de CSS/JS como texto;
- preview de blob/base64 quando possivel;
- download/copy do body;
- fallback para "preview indisponivel".

Cuidados:

- response body pode ser grande;
- response body pode ser binario;
- response body pode conter dados sensiveis;
- Captura leve pode nao ter todos os bodies;
- Captura completa pode depender de Network.getResponseBody;
- SVG pode conter conteudo potencialmente perigoso, entao renderizar com cuidado.

## 4. Theme, Colors and Branding

Ideia:

Pensar em temas, cores e logo do InterceptPilot.

Itens para estudar:

- paleta oficial;
- tema escuro atual;
- tema claro futuro;
- tokens CSS;
- cor primaria;
- danger/warning/info/success;
- icones;
- logo;
- splash/onboarding visual;
- consistencia entre Sidepanel e Full App;
- possibilidade de variacoes por produto.

Tambem considerar familia de produtos:

- InterceptPilot;
- LayoutPilot;
- possivel marca guarda-chuva, como Alpin Labs ou Alpin Tools;
- decidir se mantem "Pilot" nos nomes ou se cria naming mais proprio.

## 5. Capture Mode Improvements

Ideias futuras:

- Captura leve com XMLHttpRequest alem de fetch;
- fallback Auto mais refinado;
- melhor deteccao de conflito com DevTools/extensoes;
- explicacao mais clara das limitacoes de Captura leve;
- compatibilidade com Jam/LastPass/outras extensoes;
- evitar banner de debugger quando possivel usando modo leve.

Cuidados:

- nao prometer paridade total com Captura completa;
- XHR pode ter detalhes diferentes de fetch;
- compatibilidade com monkey patching de terceiros;
- timing de injecao do script.

## 6. Rule State / Matched State Reliability

Ideia:

Revisitar no futuro o bug complexo do estado "Acionada" na Captura completa.

Contexto:

- Captura leve passou a persistir melhor o estado visual;
- Captura completa ainda teve cenarios dificeis envolvendo troca de aba/contexto;
- varias tentativas ja foram feitas;
- nao retomar sem logs bem direcionados.

Itens para estudar:

- cycle id da aba capturada;
- trava explicita para reset apenas em reload real da aba capturada;
- evitar reset por troca de aba, Full App, extension://, edge://extensions;
- logs de diagnostico para resetMatchedStateForNewPageCycle.

## 7. Session Report / Recording

Ideia:

Avaliar uma feature futura de captura de sessao/bug report.

Possivel direcao:

- gravar video curto;
- capturar network/logs/rules aplicadas;
- gerar HTML unico offline com video + timeline + contexto;
- evitar depender de servidor no MVP.

Cuidados:

- permissoes de gravacao;
- privacidade;
- tamanho do arquivo;
- UX de export;
- nao virar clone completo do Jam.

## 8. Export / Import Improvements

Ideias:

- export geral de todas as collections;
- export de cenario atual;
- export de network/logs/rules relacionadas;
- import com preview;
- validacao antes de importar;
- conflitos/renomeacao;
- bundle para QA/dev.

## 9. Data Tables / Advanced Lists

Ideias futuras:

- virtualizacao simples para listas grandes;
- sorting por colunas;
- resize de colunas;
- filtros salvos;
- busca avancada;
- agrupamento por ciclo/reload;
- agrupamento por domain/status/rule.

Cuidados:

- nao criar abstracao generica pesada cedo demais;
- preservar performance;
- manter Sidepanel compacto.

## 10. Security and Privacy

Ideias:

- mascarar Authorization/Cookie/Set-Cookie por padrao em cURL/fetch;
- opcao explicita para copiar headers sensiveis;
- avisos em export;
- limpar dados sensiveis;
- modo privado/local-only bem explicado.

## 11. Known Non-goals for Now

Nao sao prioridade agora:

- SaaS/upload/link compartilhavel;
- marketplace/publicacao imediata;
- troca de stack;
- React/Vue;
- backend;
- billing;
- proxy local.

## 12. How to use this document

Este arquivo e um backlog futuro. Nao implementar tudo de uma vez.

Cada ideia deve virar uma auditoria ou plano proprio antes de codar. A priorizacao deve partir de dor real apos uso do InterceptPilot, nao da simples existencia de uma ideia neste documento.
