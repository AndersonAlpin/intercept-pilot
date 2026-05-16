const es = {
  common: {
    open: 'Abrir', attach: 'Adjuntar', reattach: 'Readjuntar', detach: 'Desadjuntar', reload: 'Recargar',
    enabled: 'habilitado', disabled: 'deshabilitado', manage: 'Gestionar', edit: 'Editar', delete: 'Eliminar',
    cancel: 'Cancelar', save: 'Guardar', clear: 'Limpiar', refresh: 'Actualizar', create: 'Crear',
    import: 'Importar', export: 'Exportar', diagnostics: 'Diagnóstico', search: 'Buscar', status: 'Estado',
    method: 'Método', level: 'Nivel', settings: 'Configuración', close: 'Cerrar', yes: 'Sí', no: 'No',
    copy: 'Copiar', copyJson: 'Copiar JSON', exportJson: 'Exportar JSON', downloadJson: 'Descargar JSON',
    moreActions: 'Más acciones', advanced: 'Avanzado'
  },
  language: { title: 'Idioma', english: 'English', portuguese: 'Português', spanish: 'Español' },
  status: {
    connecting: 'Conectando...', attached: 'Adjuntado a la pestaña actual', notAttached: 'No adjuntado',
    noActiveUrl: 'Sin URL activa', reloadHint: 'Recarga la página actual para aplicar reglas'
  },
  navigation: {
    rules: 'Reglas', network: 'Red', logs: 'Logs', dashboard: 'Dashboard', collections: 'Colecciones',
    importExport: 'Importar / Exportar', diagnostics: 'Diagnóstico', settings: 'Configuración'
  },
  collections: {
    title: 'Colección', activeCollection: 'Colección activa', noCollections: 'Sin colecciones.',
    newCollection: 'Nueva colección', setActive: 'Definir activa', rename: 'Renombrar',
    deleteConfirm: '¿Eliminar esta colección? Las reglas irán a la colección de respaldo.', rulesCount: 'regla(s)'
  },
  rules: {
    title: 'Reglas', newRule: '+ Regla', searchPlaceholder: 'Buscar reglas', noRules: 'No hay reglas en esta colección.',
    advanced: 'Avanzado ↗', advancedEditor: '¿Necesitas headers, regex, prioridad o diagnósticos? Abrir editor avanzado ↗',
    createRule: 'Crear regla', editRule: 'Editar regla', ruleName: 'Nombre de regla', urlPattern: 'Patrón de URL',
    actionType: 'Tipo de acción', statusCode: 'Código de estado', delayMs: 'Delay ms',
    createEnabledRule: 'Crear regla habilitada', saveQuickEdit: 'Guardar edición rápida', mockThis: 'Mockear', inspect: 'Inspeccionar ↗',
    noRequests: 'Sin requests todavía.', passThrough: 'passThrough', noMatch: 'Sin match',
    saveSuccess: 'Regla guardada.', saveError: 'Error al guardar regla.', deleteConfirm: '¿Eliminar esta regla?',
    createFromRequestError: 'Error al crear regla desde request.',
    exportRule: 'Exportar', exportCopiedRule: 'JSON de la regla copiado.'
  },
  logs: { title: 'Logs', errorOnly: 'solo errores', clearLogs: 'Limpiar logs', noLogs: 'Sin logs.' },
  network: {
    title: 'Red', filterUrl: 'Filtrar URL', filterMethod: 'Método', filterStatus: 'Estado',
    matchedOnly: 'solo matched', interceptedOnly: 'solo interceptadas', noRequests: 'Sin requests capturadas.',
    createRule: 'Crear regla'
  },
  dashboard: {
    attached: 'Adjuntado', enabledRules: 'Reglas habilitadas', matchedRecently: 'Matches recientes', errors: 'Errores',
    currentContext: 'Contexto actual', activeCollection: 'Colección activa', recentNetwork: 'Entradas de red recientes', recentLogs: 'Logs recientes'
  },
  fullapp: {
    noRuleSelected: 'Selecciona una regla para editar.', ruleEditor: 'Editor de reglas',
    importPlaceholder: 'Pega JSON para importar', importStrategy: 'Estrategia de importación: merge por id (MVP actual).',
    noImportExportAction: 'Sin acciones de import/export todavía.', exportCurrentCollection: 'Exportar colección actual',
    exportAllData: 'Exportar todos los datos', importJson: 'Importar JSON', importPickFile: 'Elegir archivo JSON', saveSettings: 'Guardar configuración',
    autoAttach: 'Auto-adjuntar', autoReloadAfterRuleChange: 'Auto-recargar tras cambio de regla',
    maxNetworkEntries: 'Máx. entradas de red', maxLogs: 'Máx. logs', attachedUrl: 'URL adjuntada',
    attachedTabId: 'attachedTabId', isAttached: 'isAttached', enabledRules: 'reglas habilitadas',
    invalidRules: 'reglas inválidas', recentRuntimeLogs: 'Logs recientes de runtime', noLogs: 'Sin logs.',
    newRule: 'Nueva regla', exportCollection: 'Exportar colección', importRule: 'Importar', settingsSaved: 'Configuración guardada.',
    importCompleted: 'Importación completada (merge por id).', exportCopiedCollection: 'JSON de colección copiado.', exportCopiedAll: 'JSON de todos los datos copiado.'
  },
  errors: { invalidJson: 'Formato JSON inválido.', unknown: 'Error inesperado.' },
  toasts: {
    ruleCopied: 'JSON de la regla copiado.',
    ruleExported: 'JSON de la regla exportado.',
    collectionCopied: 'JSON de la colección copiado.',
    collectionExported: 'JSON de la colección exportado.',
    ruleImported: 'Regla importada.',
    collectionImported: 'Colección importada.',
    importCompleted: 'Importación completada.',
    invalidJson: 'JSON inválido.',
    unsupportedType: 'Tipo de JSON de MockPilot no soportado.',
    copyError: 'No se pudo copiar el JSON.',
    exportError: 'No se pudo exportar el JSON.',
    importError: 'No se pudo importar el JSON.',
    ruleImportError: 'No se pudo importar la regla.',
    collectionImportError: 'No se pudo importar la colección.'
  },
  badges: { mock: 'mock', fail: 'fallo', delay: 'delay', pass: 'pass', ok: 'ok', conflict: 'conflicto', error: 'error', warn: 'aviso', info: 'info' }
}

export default es
