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

test('AI Bridge proposal modal is empty without a pending proposal', () => {
  assert.equal(renderAiBridgeProposalModal(null), '')
  assert.equal(renderAiBridgeProposalModal({}), '')
})

test('Full App renders and handles AI Bridge proposal modal globally', () => {
  assert.match(fullAppSource, /renderAiBridgeProposalModal\(state\.aiBridgePendingImport\)/)
  assert.match(fullAppSource, /\$\('#full-ai-proposal-cancel-btn'\)\?\.addEventListener\('click', cancelAiBridgePendingImport\)/)
  assert.match(fullAppSource, /\$\('#full-ai-proposal-confirm-btn'\)\?\.addEventListener\('click', confirmAiBridgePendingImport\)/)

  const aiBridgeImportHandler = fullAppSource.match(/if \(message\?\.type === 'state:aiBridgeImport'\) \{[\s\S]*?\n  \}/)?.[0] || ''
  assert.match(aiBridgeImportHandler, /state\.aiBridgePendingImport = message\.pendingImport \|\| null/)
  assert.match(aiBridgeImportHandler, /render\(\)/)
  assert.doesNotMatch(aiBridgeImportHandler, /state\.page === 'import-export'/)
})

test('AI Bridge import proposals do not force the Full App to the Import page', () => {
  const proposeAiBridgeImport = backgroundSource.match(/async function proposeAiBridgeImport\(payload\) \{[\s\S]*?\n\}/)?.[0] || ''

  assert.match(proposeAiBridgeImport, /broadcastAiBridgeImport\(\)/)
  assert.doesNotMatch(proposeAiBridgeImport, /openFullAppPage\('import-export'\)/)
})
