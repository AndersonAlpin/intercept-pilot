const pt = {
  common: {
    open: 'Abrir', attach: 'Anexar', reattach: 'Reanexar', detach: 'Desanexar', reload: 'Recarregar',
    enabled: 'ativado', disabled: 'desativado', manage: 'Gerenciar', edit: 'Editar', delete: 'Excluir',
    cancel: 'Cancelar', save: 'Salvar', clear: 'Limpar', refresh: 'Atualizar', create: 'Criar',
    import: 'Importar', export: 'Exportar', diagnostics: 'Diagnóstico', search: 'Buscar', status: 'Status',
    method: 'Método', level: 'Nível', settings: 'Configurações', close: 'Fechar', yes: 'Sim', no: 'Não'
  },
  language: { title: 'Idioma', english: 'English', portuguese: 'Português', spanish: 'Español' },
  status: {
    connecting: 'Conectando...', attached: 'Anexado à aba atual', notAttached: 'Não anexado',
    noActiveUrl: 'Sem URL ativa', reloadHint: 'Recarregue a página atual para aplicar as regras'
  },
  navigation: {
    rules: 'Regras', network: 'Network', logs: 'Logs', dashboard: 'Dashboard', collections: 'Coleções',
    importExport: 'Importar / Exportar', diagnostics: 'Diagnóstico', settings: 'Configurações'
  },
  collections: {
    title: 'Coleção', activeCollection: 'Coleção ativa', noCollections: 'Sem coleções.',
    newCollection: 'Nova coleção', setActive: 'Definir ativa', rename: 'Renomear',
    deleteConfirm: 'Excluir esta coleção? As regras serão movidas para a coleção de fallback.', rulesCount: 'regra(s)'
  },
  rules: {
    title: 'Regras', newRule: '+ Regra', searchPlaceholder: 'Buscar regras', noRules: 'Sem regras nesta coleção.',
    advanced: 'Avançado ↗', advancedEditor: 'Precisa de headers, regex, prioridade ou diagnóstico? Abrir editor avançado ↗',
    createRule: 'Criar Regra', editRule: 'Editar Regra', ruleName: 'Nome da regra', urlPattern: 'Padrão de URL',
    actionType: 'Tipo de ação', statusCode: 'Código de status', delayMs: 'Atraso (ms)',
    createEnabledRule: 'Criar regra ativada', saveQuickEdit: 'Salvar edição rápida', mockThis: 'Mockar', inspect: 'Inspecionar ↗',
    noRequests: 'Sem requisições ainda.', passThrough: 'passThrough', noMatch: 'Sem match',
    saveSuccess: 'Regra salva com sucesso.', saveError: 'Falha ao salvar regra.', deleteConfirm: 'Excluir esta regra?',
    createFromRequestError: 'Falha ao criar regra da requisição.'
  },
  logs: { title: 'Logs', errorOnly: 'somente erro', clearLogs: 'Limpar logs', noLogs: 'Sem logs.' },
  network: {
    title: 'Network', filterUrl: 'Filtrar URL', filterMethod: 'Método', filterStatus: 'Status',
    matchedOnly: 'somente match', interceptedOnly: 'somente interceptadas', noRequests: 'Sem requisições capturadas.',
    createRule: 'Criar regra'
  },
  dashboard: {
    attached: 'Anexado', enabledRules: 'Regras ativas', matchedRecently: 'Matches recentes', errors: 'Erros',
    currentContext: 'Contexto atual', activeCollection: 'Coleção ativa', recentNetwork: 'Entradas de network recentes', recentLogs: 'Logs recentes'
  },
  fullapp: {
    noRuleSelected: 'Selecione uma regra para editar.', ruleEditor: 'Editor de Regra',
    importPlaceholder: 'Cole o JSON para importar', importStrategy: 'Estratégia de importação: merge por id (MVP atual).',
    noImportExportAction: 'Nenhuma ação de import/export ainda.', exportCurrentCollection: 'Exportar coleção atual',
    exportAllData: 'Exportar todos os dados', importJson: 'Importar JSON', saveSettings: 'Salvar configurações',
    autoAttach: 'Auto-anexar', autoReloadAfterRuleChange: 'Auto recarregar após alterar regra',
    maxNetworkEntries: 'Máximo de entradas de network', maxLogs: 'Máximo de logs',
    attachedUrl: 'URL anexada', attachedTabId: 'attachedTabId', isAttached: 'isAttached', enabledRules: 'regras ativas',
    invalidRules: 'regras inválidas', recentRuntimeLogs: 'Logs recentes do runtime', noLogs: 'Sem logs.',
    newRule: 'Nova regra', exportCollection: 'Exportar coleção', importRule: 'Importar', settingsSaved: 'Configurações salvas.',
    importCompleted: 'Importação concluída (merge por id).', exportCopiedCollection: 'JSON da coleção atual copiado.', exportCopiedAll: 'JSON de todos os dados copiado.'
  },
  errors: { invalidJson: 'Formato JSON inválido.', unknown: 'Erro inesperado.' },
  badges: { mock: 'mock', fail: 'falha', delay: 'atraso', pass: 'pass', ok: 'ok', conflict: 'conflito', error: 'erro', warn: 'aviso', info: 'info' }
}

export default pt
