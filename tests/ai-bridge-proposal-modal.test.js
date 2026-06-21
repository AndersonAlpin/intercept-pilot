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
  assert.match(html, /Regra única/)
  assert.match(html, /Mock AI Bridge test - sucesso 200/)
  assert.match(html, /GET/)
  assert.match(html, /\/api\/ai-bridge-test\?beta=1/)
  assert.match(html, /mockResponse/)
  assert.match(html, /200/)
  assert.match(html, /id="full-ai-proposal-confirm-btn"/)
  assert.match(html, /id="full-ai-proposal-cancel-btn"/)
  assert.match(html, /id="full-ai-proposal-import-details-link"/)
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
  assert.match(html, /Collection/)
  assert.match(html, /Checkout/)
  assert.match(html, /Rules/)
  assert.match(html, />3</)
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
  assert.match(html, /Ativar somente esta regra/)
  assert.match(html, /Checkout 200/)
  assert.match(html, /Checkout/)
  assert.match(html, /2/)
  assert.match(html, /Checkout 500, Checkout timeout/)
  assert.match(html, /Confirmar ação/)
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
  assert.match(html, /Update rule/)
  assert.match(html, /Checkout 200/)
  assert.match(html, /match\.resourceType/)
  assert.match(html, /Fetch/)
  assert.match(html, /ANY/)
  assert.match(html, /priority/)
  assert.match(html, /300/)
  assert.match(html, /The captured request is XHR/)
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
  assert.match(html, /Checkout/)
  assert.match(html, /Conta/)
  assert.match(html, /A coleção escolhida passará a ser usada pelas regras da captura\./)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
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
  assert.match(html, /AI requested deleting &quot;Checkout&quot;\./)
  assert.match(html, /This will also remove 3 rules from this collection\./)
  assert.match(html, /Checkout/)
  assert.match(html, /AI Bridge/)
  assert.match(html, /This action cannot be undone\./)
  assert.doesNotMatch(html, /Canceling will not change anything/)
  assert.match(html, /class="btn danger"/)
  assert.match(html, /class="badge contrast ai-bridge-proposal-modal__source-badge"/)
  assert.match(html, /dialog-message/)
  assert.match(html, /dialog-modal-danger/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__source"/)
  assert.doesNotMatch(html, /Rules included in deletion/)
  assert.doesNotMatch(html, /Checkout 200|Checkout 500/)
  assert.doesNotMatch(html, /ai-bridge-proposal-modal__rule-list/)
  assert.doesNotMatch(html, /responseBody|Authorization|Cookie|token=/i)
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
