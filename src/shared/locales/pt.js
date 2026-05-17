const pt = {
  common: {
    open: 'Abrir', attach: 'Anexar', reattach: 'Reanexar', detach: 'Desanexar', reload: 'Recarregar',
    enabled: 'ativado', disabled: 'desativado', manage: 'Gerenciar', edit: 'Editar', delete: 'Excluir',
    cancel: 'Cancelar', save: 'Salvar', clear: 'Limpar', refresh: 'Atualizar', create: 'Criar',
    import: 'Importar', export: 'Exportar', diagnostics: 'Diagnóstico', search: 'Buscar', status: 'Status',
    method: 'Método', level: 'Nível', settings: 'Configurações', close: 'Fechar', yes: 'Sim', no: 'Não',
    copy: 'Copiar', copyJson: 'Copiar JSON', exportJson: 'Exportar JSON', downloadJson: 'Baixar JSON',
    moreActions: 'Mais ações', disableAutoAttach: 'Desativar auto-anexar', detachNow: 'Desanexar agora', configureHosts: 'Configurar hosts', advanced: 'Avançado', confirm: 'Confirmar', activate: 'Ativar', deactivate: 'Desativar'
  },
  language: { title: 'Idioma', english: 'English', portuguese: 'Português', spanish: 'Español' },
  status: {
    connecting: 'Conectando...', attached: 'Anexado à aba atual', attachedCurrent: 'Anexado à aba atual', attachedOther: 'Anexado em outra aba', attachedTabNumber: 'Anexado à aba {position}', notAttached: 'Não anexado',
    autoAttachActive: 'Auto-anexar ativo',
    openAutoAttachSettings: 'Abrir configurações de auto-anexar',
    noActiveUrl: 'Sem URL ativa', noAttachableTab: 'Nenhuma aba anexável disponível', noEligibleTab: 'Nenhuma aba elegível',
    tabPosition: 'Aba {position}', currentTabLabel: 'Atual', reloadHint: 'Recarregue a página atual para aplicar as regras'
  },
  navigation: {
    rules: 'Regras', network: 'Rede', logs: 'Logs', dashboard: 'Dashboard', collections: 'Coleções',
    importExport: 'Importar / Exportar', diagnostics: 'Diagnóstico', settings: 'Configurações'
  },
  collections: {
    title: 'Coleção', activeCollection: 'Coleção ativa', noCollections: 'Sem coleções.',
    active: 'Ativa',
    newCollection: 'Nova coleção', newCollectionTitle: 'Nova coleção', newCollectionPlaceholder: 'Nome da coleção',
    setActive: 'Definir ativa', rename: 'Renomear', renameTitle: 'Renomear coleção', renamePlaceholder: 'Novo nome',
    deleteConfirm: 'Excluir esta coleção? As regras serão movidas para a coleção de fallback.',
    deleteTitle: 'Excluir coleção', rulesCount: 'regra(s)'
  },
  rules: {
    title: 'Regras', newRule: '+ Regra', searchPlaceholder: 'Buscar regras', noRules: 'Sem regras nesta coleção.',
    advanced: 'Avançado ↗', advancedEditor: 'Precisa de headers, regex, prioridade ou diagnóstico? Abrir editor avançado ↗',
    createRule: 'Criar Regra', editRule: 'Editar Regra', ruleName: 'Nome da regra', urlPattern: 'Padrão de URL',
    actionType: 'Tipo de ação', statusCode: 'Código de status', delayMs: 'Atraso (ms)',
    createEnabledRule: 'Criar regra ativada', saveQuickEdit: 'Salvar edição rápida', mockThis: 'Mockar', inspect: 'Inspecionar ↗',
    noRequests: 'Sem requisições ainda.', passThrough: 'passThrough', noMatch: 'Sem match',
    saveSuccess: 'Regra salva com sucesso.', saveError: 'Falha ao salvar regra.', deleteConfirm: 'Excluir esta regra?',
    deleteTitle: 'Excluir regra', deleteSuccess: 'Regra excluída.',
    createFromRequestError: 'Falha ao criar regra da requisição.',
    exportRule: 'Exportar', exportCopiedRule: 'JSON da regra copiado.',
    columns: {
      rule: 'Regra', status: 'Status', method: 'Método', action: 'Ação', state: 'Estado', hits: 'Hits', actions: 'Ações'
    },
    states: {
      ready: 'Pronta', matched: 'Acionada', disabled: 'Desativada', error: 'Erro', conflict: 'Conflito'
    },
    actionLabels: {
      mock: 'Mock', fail: 'Falha', delay: 'Atraso', pass: 'Pass'
    },
    fields: {
      name: 'Nome da regra',
      priority: 'Prioridade',
      method: 'Método',
      matchType: 'Tipo de correspondência',
      resourceType: 'Tipo de recurso',
      urlPattern: 'Padrão de URL',
      actionType: 'Tipo de ação',
      statusCode: 'Código de status',
      delayMs: 'Atraso (ms)',
      contentType: 'Content-Type',
      responseHeaders: 'Headers da resposta',
      responseBody: 'Corpo da resposta',
      applyResponseBody: 'Aplicar corpo da resposta',
      applyResponseHeaders: 'Aplicar headers da resposta'
    }
  },
  logs: { title: 'Logs', errorOnly: 'Somente erro', scopeAny: 'Todos os escopos', scopeApp: 'App', scopeWeb: 'Web', clearLogs: 'Limpar logs', noLogs: 'Sem logs.', noResults: 'Nenhum log corresponde a esses filtros.' },
  network: {
    title: 'Rede', filterUrl: 'Filtrar URL', filterMethod: 'Método', filterStatus: 'Status',
    matchedOnly: 'Somente match', interceptedOnly: 'Somente interceptadas', noRequests: 'Sem requisições capturadas.',
    noResults: 'Nenhuma requisição corresponde a esses filtros.',
    resultsCount: '{filtered} de {total}',
    createRule: 'Criar regra'
  },
  dashboard: {
    attached: 'Anexado', enabledRules: 'Regras ativas', matchedRecently: 'Matches recentes', errors: 'Erros',
    currentContext: 'Contexto atual', activeCollection: 'Coleção ativa', recentNetwork: 'Entradas de rede recentes', recentLogs: 'Logs recentes'
  },
  fullapp: {
    noRuleSelected: 'Selecione uma regra para editar.', ruleEditor: 'Editor de Regra',
    importPlaceholder: 'Cole o JSON para importar', importStrategy: 'Estratégia de importação: merge por id (MVP atual).',
    noImportExportAction: 'Nenhuma ação de import/export ainda.', exportCurrentCollection: 'Exportar coleção atual',
    exportAllData: 'Exportar todos os dados', importJson: 'Importar JSON', importPickFile: 'Escolher arquivo JSON', saveSettings: 'Salvar configurações',
    autoAttach: 'Auto-anexar', autoReloadAfterRuleChange: 'Auto recarregar após alterar regra',
    maxNetworkEntries: 'Máximo de entradas de rede', maxLogs: 'Máximo de logs',
    attachedUrl: 'URL anexada', attachedTabId: 'attachedTabId', isAttached: 'isAttached', enabledRules: 'regras ativas',
    invalidRules: 'regras inválidas', recentRuntimeLogs: 'Logs recentes do runtime', noLogs: 'Sem logs.',
    newRule: 'Nova regra', exportCollection: 'Exportar coleção', importRule: 'Importar', settingsSaved: 'Configurações salvas.',
    importCompleted: 'Importação concluída (merge por id).', exportCopiedCollection: 'JSON da coleção atual copiado.', exportCopiedAll: 'JSON de todos os dados copiado.'
  },
  errors: {
    invalidJson: 'Formato JSON inválido.',
    unknown: 'Erro inesperado.',
    ruleNameRequired: 'O nome da regra é obrigatório.',
    urlPatternRequired: 'O padrão de URL é obrigatório.',
    invalidMethod: 'Método HTTP inválido.',
    invalidResourceType: 'Tipo de recurso inválido.',
    invalidMatchType: 'Tipo de correspondência inválido.',
    invalidActionType: 'Tipo de ação inválido.',
    invalidRegex: 'Padrão regex inválido.',
    invalidStatusCode: 'O código de status deve estar entre 100 e 599.',
    invalidDelay: 'O atraso deve ser maior ou igual a 0.',
    invalidFailReason: 'Motivo de falha inválido.',
    invalidResponseBodyJson: 'O corpo da resposta deve ser um JSON válido para content type application/json.',
    attachNoTab: 'Nenhuma aba disponível para anexar.',
    attachNoActiveTab: 'Abra uma página HTTP(S) em uma aba primeiro e clique em Anexar.',
    attachHttpOnly: 'Anexar só funciona em páginas HTTP(S). Abra um site em uma aba comum primeiro.',
    attachCannotAttach: 'Não foi possível anexar o debugger a esta aba.',
    reloadNoTab: 'Nenhuma aba disponível para recarregar.'
  },
  toasts: {
    ruleCopied: 'JSON da regra copiado.',
    ruleExported: 'JSON da regra exportado.',
    collectionCopied: 'JSON da coleção copiado.',
    collectionExported: 'JSON da coleção exportado.',
    ruleImported: 'Regra importada.',
    collectionImported: 'Coleção importada.',
    importCompleted: 'Importação concluída.',
    invalidJson: 'JSON inválido.',
    unsupportedType: 'Tipo de JSON do MockPilot não suportado.',
    copyError: 'Não foi possível copiar o JSON.',
    exportError: 'Não foi possível exportar o JSON.',
    importError: 'Não foi possível importar o JSON.',
    ruleImportError: 'Não foi possível importar a regra.',
    collectionImportError: 'Não foi possível importar a coleção.',
    autoAttachStillActive: 'O auto-anexar continua ativo.'
  },
  badges: { mock: 'mock', fail: 'falha', delay: 'atraso', pass: 'pass', ok: 'ok', conflict: 'conflito', error: 'erro', warn: 'aviso', info: 'info' }
}

export default pt
