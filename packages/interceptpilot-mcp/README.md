# interceptpilot-mcp

Pacote MCP local do InterceptPilot. Ele expõe tools para agentes de IA consultarem contexto permitido, analisarem requests/regras/logs e proporem ações assistidas na extensão.

O pacote conecta clientes MCP ao InterceptPilot por um daemon local compartilhado. Esse desenho evita conflito de porta quando mais de um chat, cliente ou adapter usa a mesma stable connection key.

## Requisitos

- Node.js disponível no ambiente do cliente MCP.
- InterceptPilot instalado ou carregado como extensão local.
- AI Bridge iniciado na página Full App do InterceptPilot.
- Cliente com suporte a MCP.

## Uso local/dev

O pacote ainda está privado e com versão `0.0.0`, então o uso atual é local/dev.

Exemplo genérico:

```json
{
  "mcpServers": {
    "interceptpilot": {
      "command": "node",
      "args": [
        "<CAMINHO_LOCAL>/packages/interceptpilot-mcp/src/index.js",
        "--port",
        "<PORTA>",
        "--key",
        "<CHAVE>"
      ]
    }
  }
}
```

Use a porta e a key exibidas pela página AI Bridge. Não copie chaves reais para documentação, issues ou logs.

## Uso futuro publicado

Depois da publicação do pacote, a configuração esperada passa a poder usar `npx`:

```json
{
  "mcpServers": {
    "interceptpilot": {
      "command": "npx",
      "args": ["-y", "interceptpilot-mcp", "--key", "<CHAVE>"]
    }
  }
}
```

Esse modo é futuro enquanto o pacote continuar privado.

## Daemon compartilhado

Fluxo atual:

```txt
AI client
  -> MCP adapter
  -> shared local daemon
  -> extension WebSocket connection
  -> InterceptPilot
```

O adapter é iniciado pelo cliente MCP e expõe as tools por stdio. Quando necessário, ele inicia automaticamente o daemon local. Apenas um daemon escuta na porta configurada, e vários adapters podem se conectar a ele.

A extensão conecta no daemon usando a mesma stable connection key. Se a extensão desconectar, o daemon continua vivo e as tools retornam erro seguro até a extensão reconectar. Adapters já conectados voltam a funcionar depois da reconexão.

## Configuração

Opções atuais:

- `--key <CHAVE>`: stable connection key exibida pela página AI Bridge.
- `--port <PORTA>`: porta local do daemon. O padrão do pacote é `37177`.
- `--no-daemon-autostart`: debug. Impede o adapter de iniciar o daemon automaticamente.
- `daemon`: modo explícito para iniciar apenas o daemon.

Exemplo de daemon manual:

```bash
node <CAMINHO_LOCAL>/packages/interceptpilot-mcp/src/index.js daemon --port <PORTA> --key <CHAVE>
```

Não existe alias `--token` no estado atual.

## Tools disponíveis

### Leitura e contexto

| Tool | Quando usar | Confirmação e permissões |
| --- | --- | --- |
| `get_current_test_context` | Ver status de captura, modo, aba capturada sanitizada, coleção ativa, contagens e status do AI Bridge. | Leitura sanitizada. Não expõe query values, headers, bodies, cookies nem título da aba. |
| `list_captured_requests` | Listar requests capturados no contexto ativo. | Leitura sanitizada. Dados sensíveis ficam ocultos. |
| `list_collections` | Entender coleções disponíveis e contagens de regras. | Leitura sanitizada. |
| `list_rules` | Entender mocks e regras existentes. | Leitura sanitizada. Não expõe body de response, headers brutos, cookies, Authorization ou query values. |
| `get_active_collection` | Consultar a coleção principal atual. | Leitura sanitizada. |
| `list_sanitized_logs` | Diagnosticar logs recentes do contexto ativo. | Leitura sanitizada. Logs detalhados dependem de permissão. |
| `list_recent_rule_results` | Ver resultados recentes de regra, match e ação aplicada. | Leitura sanitizada. |
| `explain_rule_match` | Comparar uma regra com um request capturado. | Leitura diagnóstica sanitizada. |
| `get_import_bundle_schema` | Obter schema estático para montar bundles de importação. | Não exige extensão conectada e não altera estado. |
| `get_import_bundle_examples` | Obter exemplos estáticos seguros de bundles. | Não exige extensão conectada e não altera estado. |

### Busca e filtros

| Tool | Quando usar | Confirmação e permissões |
| --- | --- | --- |
| `search_captured_requests` | Buscar requests por filtros seguros e paginação. | Leitura sanitizada. Dados sensíveis dependem das permissões correspondentes. |
| `search_sanitized_logs` | Buscar logs por filtros seguros e paginação. | Leitura sanitizada. Dados sensíveis dependem das permissões correspondentes. |
| `search_rule_results` | Buscar resultados de regras por filtros seguros e paginação. | Leitura sanitizada. |
| `search_rules` | Buscar regras por metadados, match, action e diagnóstico. | Leitura sanitizada. |

### Ações e propostas

| Tool | Quando usar | Confirmação e permissões |
| --- | --- | --- |
| `import_bundle` | Propor importação de regra ou coleção. | Abre proposta, exceto quando a permissão de aplicar importação sem confirmação estiver ativa. |
| `request_enable_rule` | Solicitar ativação de regra existente. | Abre proposta, exceto quando ações de regra/coleção sem confirmação estiverem ativas. |
| `request_disable_rule` | Solicitar desativação de regra existente. | Abre proposta, exceto quando ações de regra/coleção sem confirmação estiverem ativas. |
| `request_set_only_active_rule` | Deixar uma regra como a única ativa na coleção. | Abre proposta, exceto quando ações de regra/coleção sem confirmação estiverem ativas. |
| `request_set_active_collection` | Trocar a coleção principal. | Abre proposta, exceto quando ações de regra/coleção sem confirmação estiverem ativas. |
| `request_update_rule` | Editar campos seguros de uma regra. | Abre proposta com diff antes/depois. Não permite `responseBody` nem `responseHeaders`. |
| `request_update_collection` | Editar campos seguros de uma coleção. | Abre proposta com diff antes/depois. |
| `request_delete_rule` | Excluir uma regra existente. | Sempre exige confirmação humana. |
| `request_delete_collection` | Excluir uma coleção existente. | Sempre exige confirmação humana e mostra o impacto de regras afetadas. |
| `request_reload_captured_tab` | Recarregar somente a aba capturada para validar mocks/regras. | Abre proposta, exceto quando a permissão de reload da aba capturada sem confirmação estiver ativa. Não recarrega páginas arbitrárias ou internas. |

## Segurança

- Comunicação local em `127.0.0.1`.
- Stable connection key exigida para extensão e adapters.
- Sanitização por padrão.
- Dados sensíveis dependem de permissões explícitas.
- Ações sem confirmação dependem de permissões explícitas.
- Deleção é sempre protegida por confirmação humana.
- O daemon usa allowlist de comandos.
- Não há tools diretas para limpar logs, mudar modo de captura, controlar debugger ou recarregar páginas arbitrárias.
- A stable connection key não deve aparecer em logs, erros, snackbars ou retornos MCP.

## Troubleshooting

### Extensão não conectada

Abra o Full App do InterceptPilot, vá até `AI Bridge` e inicie a conexão. Enquanto a extensão estiver desconectada, as tools retornam erro seguro.

### Daemon não iniciou

Confirme se Node.js está disponível e se o caminho local do pacote está correto. Para debug, inicie o daemon manualmente:

```bash
node <CAMINHO_LOCAL>/packages/interceptpilot-mcp/src/index.js daemon --port <PORTA> --key <CHAVE>
```

### Porta em uso

Se já houver um daemon válido na porta, outros adapters podem reutilizá-lo. Se o processo antigo estiver preso, encerre o processo antigo ou use outra porta configurada tanto no AI Bridge quanto no cliente MCP.

### Chave inválida ou regenerada

Copie novamente a configuração na página AI Bridge. Regenerar a stable connection key invalida configurações antigas.

### Cliente MCP usando config antiga

Atualize a configuração do cliente e reinicie o adapter. Permissões mudam na extensão e não exigem troca da key.

### Pacote local não encontrado

Use caminho absoluto para `packages/interceptpilot-mcp/src/index.js`. No Windows, confira casing do drive e aspas quando o caminho tiver espaços.

### Diferença entre local/dev e `npx`

O modo local/dev usa `node` com caminho local. O modo `npx` só deve ser usado depois que o pacote for publicado.
