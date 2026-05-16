const es = {
  common: {
    open: 'Abrir', attach: 'Adjuntar', reattach: 'Readjuntar', detach: 'Desadjuntar', reload: 'Recargar',
    enabled: 'habilitado', disabled: 'deshabilitado', manage: 'Gestionar', edit: 'Editar', delete: 'Eliminar',
    cancel: 'Cancelar', save: 'Guardar', clear: 'Limpiar', refresh: 'Actualizar', create: 'Crear',
    import: 'Importar', export: 'Exportar', diagnostics: 'Diagnóstico', search: 'Buscar', status: 'Estado',
    method: 'Método', level: 'Nivel', settings: 'Configuración', close: 'Cerrar', yes: 'Sí', no: 'No',
    copy: 'Copiar', copyJson: 'Copiar JSON', exportJson: 'Exportar JSON', downloadJson: 'Descargar JSON',
    moreActions: 'Más acciones', advanced: 'Avanzado', confirm: 'Confirmar'
  },
  language: { title: 'Idioma', english: 'English', portuguese: 'Português', spanish: 'Español' },
  status: {
    connecting: 'Conectando...', attached: 'Adjuntado a la pestaña actual', attachedCurrent: 'Adjuntado a la pestaña actual', attachedOther: 'Adjuntado en otra pestaña', attachedTabNumber: 'Adjuntado a la pestaña {position}', notAttached: 'No adjuntado',
    noActiveUrl: 'Sin URL activa', noAttachableTab: 'No hay pestaña adjuntable disponible',
    tabPosition: 'Pestaña {position}', currentTabLabel: 'Actual', reloadHint: 'Recarga la página actual para aplicar reglas'
  },
  navigation: {
    rules: 'Reglas', network: 'Red', logs: 'Logs', dashboard: 'Dashboard', collections: 'Colecciones',
    importExport: 'Importar / Exportar', diagnostics: 'Diagnóstico', settings: 'Configuración'
  },
  collections: {
    title: 'Colección', activeCollection: 'Colección activa', noCollections: 'Sin colecciones.',
    newCollection: 'Nueva colección', newCollectionTitle: 'Nueva colección', newCollectionPlaceholder: 'Nombre de la colección',
    setActive: 'Definir activa', rename: 'Renombrar', renameTitle: 'Renombrar colección', renamePlaceholder: 'Nuevo nombre',
    deleteConfirm: '¿Eliminar esta colección? Las reglas irán a la colección de respaldo.',
    deleteTitle: 'Eliminar colección', rulesCount: 'regla(s)'
  },
  rules: {
    title: 'Reglas', newRule: '+ Regla', searchPlaceholder: 'Buscar reglas', noRules: 'No hay reglas en esta colección.',
    advanced: 'Avanzado ↗', advancedEditor: '¿Necesitas headers, regex, prioridad o diagnósticos? Abrir editor avanzado ↗',
    createRule: 'Crear regla', editRule: 'Editar regla', ruleName: 'Nombre de regla', urlPattern: 'Patrón de URL',
    actionType: 'Tipo de acción', statusCode: 'Código de estado', delayMs: 'Delay ms',
    createEnabledRule: 'Crear regla habilitada', saveQuickEdit: 'Guardar edición rápida', mockThis: 'Mockear', inspect: 'Inspeccionar ↗',
    noRequests: 'Sin requests todavía.', passThrough: 'passThrough', noMatch: 'Sin match',
    saveSuccess: 'Regla guardada.', saveError: 'Error al guardar regla.', deleteConfirm: '¿Eliminar esta regla?',
    deleteTitle: 'Eliminar regla', deleteSuccess: 'Regla eliminada.',
    createFromRequestError: 'Error al crear regla desde request.',
    exportRule: 'Exportar', exportCopiedRule: 'JSON de la regla copiado.',
    columns: {
      rule: 'Regla', status: 'Estado', method: 'Método', action: 'Acción', state: 'Estado', hits: 'Hits', actions: 'Acciones'
    },
    states: {
      ready: 'Lista', matched: 'Activada', disabled: 'Desactivada', error: 'Error', conflict: 'Conflicto'
    },
    actionLabels: {
      mock: 'Mock', fail: 'Fallo', delay: 'Retraso', pass: 'Pass'
    },
    fields: {
      name: 'Nombre de la regla',
      priority: 'Prioridad',
      method: 'Método',
      matchType: 'Tipo de coincidencia',
      resourceType: 'Tipo de recurso',
      urlPattern: 'Patrón de URL',
      actionType: 'Tipo de acción',
      statusCode: 'Código de estado',
      delayMs: 'Retraso (ms)',
      contentType: 'Content-Type',
      responseHeaders: 'Headers de la respuesta',
      responseBody: 'Cuerpo de la respuesta',
      applyResponseBody: 'Aplicar cuerpo de la respuesta',
      applyResponseHeaders: 'Aplicar headers de la respuesta'
    }
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
  errors: {
    invalidJson: 'Formato JSON inválido.',
    unknown: 'Error inesperado.',
    ruleNameRequired: 'El nombre de la regla es obligatorio.',
    urlPatternRequired: 'El patrón de URL es obligatorio.',
    invalidMethod: 'Método HTTP inválido.',
    invalidResourceType: 'Tipo de recurso inválido.',
    invalidMatchType: 'Tipo de coincidencia inválido.',
    invalidActionType: 'Tipo de acción inválido.',
    invalidRegex: 'Patrón regex inválido.',
    invalidStatusCode: 'El código de estado debe estar entre 100 y 599.',
    invalidDelay: 'El delay debe ser mayor o igual a 0.',
    invalidFailReason: 'Motivo de fallo inválido.',
    invalidResponseBodyJson: 'El cuerpo de la respuesta debe ser un JSON válido para content type application/json.',
    attachNoTab: 'No hay pestaña disponible para adjuntar.',
    attachNoActiveTab: 'Abre una página HTTP(S) en una pestaña primero y haz clic en Adjuntar.',
    attachHttpOnly: 'Adjuntar solo funciona en páginas HTTP(S). Abre un sitio en una pestaña normal primero.',
    attachCannotAttach: 'No se pudo adjuntar el depurador a esta pestaña.',
    reloadNoTab: 'No hay pestaña disponible para recargar.'
  },
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
