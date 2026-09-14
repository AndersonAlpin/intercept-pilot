import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { setLocale } from '../src/shared/i18n.js'
import { renderAiBridgeProposalModal } from '../src/fullapp/components/ai-bridge-proposal-modal.js'

const fullAppSource = readFileSync(new URL('../src/fullapp/fullapp.js', import.meta.url), 'utf8')
const backgroundSource = readFileSync(new URL('../src/background/background.js', import.meta.url), 'utf8')

const ruleProposal = {
  id: 'ai-import-rule-1',
  source: 'AI Bridge',
  summary: {
    type: 'interceptpilot.rule',
    ruleName: 'Mock AI Bridge test - sucesso 200'
  },
  bundle: {
    type: 'interceptpilot.rule',
    rule: {
      name: 'Mock AI Bridge test - sucesso 200',
      match: {
        method: 'GET',
        urlPattern: '/api/ai-bridge-test?beta=1'
      },
      action: {
        type: 'mockResponse',
        status: 200,
        contentType: 'application/json',
        responseBody: '{"token":"secret","ok":true}'
      }
    }
  }
}

test('AI Bridge proposal modal renders a safe single-rule import summary', () => {
  setLocale('pt-BR')

  const html = renderAiBridgeProposalModal(ruleProposal)

  assert.match(html, /data-ai-bridge-proposal-modal="true"/)
  assert.match(html, /Importação proposta pela IA/)
  assert.match(html, /AI Bridge/)
  assert.match(html, /Importar a regra “<strong>Mock AI Bridge test - sucesso 200<\/strong>”\./)
  assert.match(html, /<strong>GET<\/strong> <strong>\/api\/ai-bridge-test\?beta=1<\/strong>/)
  assert.match(html, /<strong>mockResponse 200<\/strong>/)
  assert.doesNotMatch(html, /A IA propôs importar a regra/)
  assert.doesNotMatch(html, /Nada será aplicado sem sua confirmação\./)
  assert.match(html, /id="full-ai-proposal-confirm-btn"/)
  assert.match(html, /id="full-ai-proposal-cancel-btn"/)
  assert.doesNotMatch(html, /id="full-ai-proposal-import-details-link"/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.doesNotMatch(html, /secret/)
  assert.doesNotMatch(html, /responseBody/)
  assert.doesNotMatch(html, /contentType/)
})

test('AI Bridge proposal modal renders a collection import summary', () => {
  setLocale('en')

  const html = renderAiBridgeProposalModal({
    id: 'ai-import-collection-1',
    source: 'AI Bridge',
    summary: {
      type: 'interceptpilot.collection',
      collectionName: 'Checkout',
      ruleCount: 3
    },
    bundle: {
      type: 'interceptpilot.collection',
      collection: {
        name: 'Checkout',
        rules: [{ name: 'A' }, { name: 'B' }, { name: 'C' }]
      }
    }
  })

  assert.match(html, /AI proposed import/)
  assert.match(html, /Import collection &quot;<strong>Checkout<\/strong>&quot;\./)
  assert.match(html, /This will add <strong>3<\/strong> rules\./)
  assert.doesNotMatch(html, /AI proposed importing collection/)
  assert.doesNotMatch(html, /Nothing will be applied without your confirmation\./)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.doesNotMatch(html, /full-ai-proposal-import-details-link/)
})

test('AI Bridge proposal modal renders a safe rule action summary', () => {
  setLocale('pt-BR')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-1',
      source: 'AI Bridge',
      action: 'set_only_active_rule',
      summary: {
        ruleId: 'rule-1',
        ruleName: 'Checkout 200',
        collectionId: 'collection-1',
        collectionName: 'Checkout',
        affectedRuleCount: 2,
        affectedRules: [
          { id: 'rule-2', name: 'Checkout 500' },
          { id: 'rule-3', name: 'Checkout timeout' }
        ]
      }
    }
  })

  assert.match(html, /data-ai-bridge-proposal-modal="true"/)
  assert.match(html, /Ação proposta pela IA/)
  assert.match(html, /Ativar somente a regra “<strong>Checkout 200<\/strong>”\./)
  assert.match(html, /Isso desativará <strong>2<\/strong> regras na coleção “<strong>Checkout<\/strong>”\./)
  assert.doesNotMatch(html, /A IA solicitou ativar somente a regra/)
  assert.doesNotMatch(html, /Coleção: Checkout\./)
  assert.doesNotMatch(html, /Checkout 500, Checkout timeout/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.match(html, /Confirmar/)
  assert.doesNotMatch(html, /Confirmar ação/)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
})

test('AI Bridge proposal modal renders a safe edit diff summary', () => {
  setLocale('en')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-edit',
      source: 'AI Bridge',
      action: 'update_rule',
      summary: {
        ruleId: 'rule-1',
        ruleName: 'Checkout 200',
        collectionId: 'collection-1',
        collectionName: 'Checkout',
        reason: 'The captured request is XHR and the rule currently targets Fetch.',
        diff: [
          { field: 'match.resourceType', before: 'Fetch', after: 'ANY' },
          { field: 'priority', before: 100, after: 300 }
        ]
      }
    }
  })

  assert.match(html, /AI proposed action/)
  assert.match(html, /Edit rule &quot;<strong>Checkout 200<\/strong>&quot;\./)
  assert.match(html, /Collection: <strong>Checkout<\/strong>\./)
  assert.match(html, /Reason: The captured request is XHR/)
  assert.match(html, /match\.resourceType/)
  assert.match(html, /Before: <strong>Fetch<\/strong>/)
  assert.match(html, /After: <strong>ANY<\/strong>/)
  assert.match(html, /priority/)
  assert.match(html, /Before: <strong>100<\/strong>/)
  assert.match(html, /After: <strong>300<\/strong>/)
  assert.doesNotMatch(html, /AI requested updating rule/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
})

test('AI Bridge proposal modal renders set active collection summary', () => {
  setLocale('pt-BR')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-active-collection',
      source: 'AI Bridge',
      action: 'set_active_collection',
      summary: {
        collectionId: 'collection-2',
        collectionName: 'Conta',
        previousCollectionId: 'collection-1',
        previousCollectionName: 'Checkout'
      }
    }
  })

  assert.match(html, /Definir coleção principal/)
  assert.match(html, /Usar a coleção “<strong>Conta<\/strong>”\./)
  assert.match(html, /Coleção atual: <strong>Checkout<\/strong>\./)
  assert.doesNotMatch(html, /A IA solicitou definir/)
  assert.doesNotMatch(html, /A coleção escolhida passará a ser usada pelas regras da captura\./)
  assert.doesNotMatch(html, /Nada será aplicado sem sua confirmação\./)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
})

test('AI Bridge proposal modal renders reload as a narrative confirmation', () => {
  setLocale('en')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-reload',
      source: 'AI Bridge',
      action: 'reload_captured_tab',
      summary: {
        origin: 'https://app.test',
        path: '/videos'
      }
    }
  })

  assert.match(html, /AI proposed action/)
  assert.match(html, /Reload captured tab\./)
  assert.match(html, /Tab: <strong>https:\/\/app\.test\/videos<\/strong>\./)
  assert.doesNotMatch(html, /AI requested reloading/)
  assert.doesNotMatch(html, /Only the captured tab will be reloaded\./)
  assert.doesNotMatch(html, /Nothing will be applied without your confirmation\./)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
})

test('AI Bridge proposal modal renders a protected delete warning', () => {
  setLocale('en')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-delete',
      source: 'AI Bridge',
      action: 'delete_collection',
      summary: {
        collectionId: 'collection-1',
        collectionName: 'Checkout',
        affectedRuleCount: 3,
        affectedRules: [
          { id: 'rule-1', name: 'Checkout 200' },
          { id: 'rule-2', name: 'Checkout 500' }
        ]
      }
    }
  })

  assert.match(html, /Delete this collection\?/)
  assert.match(html, /Delete collection/)
  assert.match(html, /Deleting &quot;<strong>Checkout<\/strong>&quot; will also remove <strong>3<\/strong> rules from this collection\./)
  assert.doesNotMatch(html, /AI requested deleting/)
  assert.match(html, /AI Bridge/)
  assert.match(html, /This action cannot be undone\./)
  assert.doesNotMatch(html, /Canceling will not change anything/)
  assert.match(html, /class="btn danger"/)
  assert.match(html, /class="badge contrast ai-bridge-proposal-modal__source-badge"/)
  assert.match(html, /dialog-message/)
  assert.match(html, /dialog-modal-danger/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__grid/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__source"/)
  assert.doesNotMatch(html, /Rules included in deletion/)
  assert.doesNotMatch(html, /Checkout 200|Checkout 500/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__rule-list/)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
})

test('AI Bridge proposal modal escapes dynamic HTML while preserving safe emphasis', () => {
  setLocale('en')

  const html = renderAiBridgeProposalModal({
    pendingAction: {
      id: 'ai-action-unsafe',
      source: 'AI Bridge',
      action: 'update_rule',
      summary: {
        ruleName: '<img src=x onerror=alert(1)>',
        collectionName: '<script>alert(1)</script>',
        reason: '<b>XHR</b>',
        diff: [
          { field: '<field>', before: '<Fetch>', after: '<ANY>' }
        ]
      }
    }
  })

  assert.match(html, /<strong>&lt;img src=x onerror=alert\(1\)&gt;<\/strong>/)
  assert.match(html, /<strong>&lt;script&gt;alert\(1\)&lt;\/script&gt;<\/strong>/)
  assert.match(html, /Reason: &lt;b&gt;XHR&lt;\/b&gt;/)
  assert.match(html, /&lt;field&gt;/)
  assert.match(html, /Before: <strong>&lt;Fetch&gt;<\/strong>/)
  assert.match(html, /After: <strong>&lt;ANY&gt;<\/strong>/)
  assert.doesNotMatch(html, /<img src=x/)
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /<b>XHR<\/b>/)
})

test('AI Bridge proposal modal is empty without a pending proposal', () => {
  assert.equal(renderAiBridgeProposalModal(null), '')
  assert.equal(renderAiBridgeProposalModal({}), '')
})

test('Full App renders and handles AI Bridge proposal modal globally', () => {
  assert.match(fullAppSource, /renderAiBridgeProposalModal\(\{\s*pendingImport: state\.aiBridgePendingImport,\s*pendingAction: state\.aiBridgePendingAction\s*\}\)/)
  assert.match(fullAppSource, /\$\('#full-ai-proposal-cancel-btn'\)\?\.addEventListener\('click', cancelAiBridgeProposal\)/)
  assert.match(fullAppSource, /\$\('#full-ai-proposal-confirm-btn'\)\?\.addEventListener\('click', confirmAiBridgeProposal\)/)

  const aiBridgeImportHandler = fullAppSource.match(/if \(message\?\.type === 'state:aiBridgeImport'\) \{[\s\S]*?\n  \}/)?.[0] || ''
  assert.match(aiBridgeImportHandler, /state\.aiBridgePendingImport = message\.pendingImport \|\| null/)
  assert.match(aiBridgeImportHandler, /render\(\)/)
  assert.doesNotMatch(aiBridgeImportHandler, /state\.page === 'import-export'/)

  const aiBridgeActionHandler = fullAppSource.match(/if \(message\?\.type === 'state:aiBridgeAction'\) \{[\s\S]*?\n  \}/)?.[0] || ''
  assert.match(aiBridgeActionHandler, /state\.aiBridgePendingAction = message\.pendingAction \|\| null/)
  assert.match(aiBridgeActionHandler, /render\(\)/)
})

test('AI Bridge import proposals do not force the Full App to the Import page', () => {
  const proposeAiBridgeImport = backgroundSource.match(/async function proposeAiBridgeImport\(payload\) \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(proposeAiBridgeImport, /broadcastAiBridgeImport\(\)/)
  assert.doesNotMatch(proposeAiBridgeImport, /openFullAppPage\('import-export'\)/)
})
