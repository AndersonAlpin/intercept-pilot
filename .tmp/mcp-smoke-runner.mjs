import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const mcpPackageRoot = `${process.cwd()}\\packages\\interceptpilot-mcp`
const requireFromMcpPackage = createRequire(`${mcpPackageRoot}\\package.json`)
const { Client } = await import(pathToFileURL(requireFromMcpPackage.resolve('@modelcontextprotocol/sdk/client/index.js')).href)
const { StdioClientTransport } = await import(pathToFileURL(requireFromMcpPackage.resolve('@modelcontextprotocol/sdk/client/stdio.js')).href)

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function getArg(name, fallback = '') {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1) return fallback
  return process.argv[index + 1] || fallback
}

async function createClient(port) {
  const token = getArg('token')
  const args = ['src/index.js', '--token', token]
  if (port) args.push('--port', port)
  const transport = new StdioClientTransport({
    command: 'node',
    args,
    cwd: mcpPackageRoot
  })
  const client = new Client({ name: 'interceptpilot-smoke-runner', version: '0.0.0' })
  await client.connect(transport)
  await wait(Number(getArg('wait', '2000')))
  return client
}

async function callTool(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args })
  const text = result.content?.map(item => item.text || '').join('\n') || ''
  return { result, text }
}

const action = process.argv[2]
const client = await createClient(getArg('port'))

try {
  if (action === 'context') {
    const { result, text } = await callTool(client, 'get_current_test_context')
    const data = result.isError ? null : JSON.parse(text || '{}')
    console.log(JSON.stringify({
      isError: Boolean(result.isError),
      message: result.isError ? text : '',
      capture: data?.capture,
      tab: data?.tab,
      activeCollection: data?.activeCollection,
      counts: data?.counts
    }, null, 2))
  } else if (action === 'tools') {
    const tools = await client.listTools()
    const names = tools.tools.map(tool => tool.name).sort()
    console.log(JSON.stringify({ tools: names }, null, 2))
  } else if (action === 'create-pending-import') {
    const bundleJson = JSON.stringify({
      schemaVersion: 1,
      type: 'interceptpilot.rule',
      rule: {
        name: 'AI Bridge revoke pending test',
        enabled: true,
        priority: 130,
        match: {
          urlPattern: '/api/ai-bridge-revoke-pending',
          matchType: 'contains',
          method: 'GET',
          resourceType: 'ANY'
        },
        action: {
          type: 'mockResponse',
          statusCode: 200,
          statusText: 'OK',
          contentType: 'application/json',
          responseBody: '{"ok":true,"source":"ai-bridge-revoke-pending"}'
        }
      }
    })
    const { result, text } = await callTool(client, 'import_bundle', { bundleJson })
    console.log(JSON.stringify({
      isError: Boolean(result.isError),
      message: text
    }, null, 2))
  } else if (action === 'find-rule') {
    const name = getArg('name')
    const { result, text } = await callTool(client, 'list_rules')
    if (result.isError) {
      console.log(JSON.stringify({ isError: true, message: text }, null, 2))
    } else {
      const rules = JSON.parse(text || '[]')
      const matches = rules.filter(rule => rule.name === name)
      console.log(JSON.stringify({
        isError: false,
        count: matches.length,
        matches: matches.map(rule => ({ name: rule.name, enabled: rule.enabled, collectionId: rule.collectionId }))
      }, null, 2))
    }
  } else if (action === 'requests-summary') {
    const { result, text } = await callTool(client, 'list_captured_requests')
    if (result.isError) {
      console.log(JSON.stringify({ isError: true, message: text }, null, 2))
    } else {
      const requests = JSON.parse(text || '[]')
      const rawText = JSON.stringify(requests)
      const suspiciousValuePatterns = [
        /authorization/i,
        /set-cookie/i,
        /cookie/i,
        /bearer\s+[a-z0-9._-]+/i,
        /token=/i,
        /access_token=/i,
        /refresh_token=/i,
        /password=/i
      ]
      console.log(JSON.stringify({
        isError: false,
        returnedCount: requests.length,
        firstId: requests[0]?.id || null,
        lastId: requests.at(-1)?.id || null,
        hasSensitivePattern: suspiciousValuePatterns.some(pattern => pattern.test(rawText)),
        sample: requests.slice(0, 3).map(request => ({
          method: request.method,
          urlSanitized: request.urlSanitized,
          queryKeys: request.queryKeys,
          hasQuery: request.hasQuery,
          hasRequestBody: request.hasRequestBody,
          hasResponseBody: request.hasResponseBody,
          requestHeaderNames: request.requestHeaderNames,
          responseHeaderNames: request.responseHeaderNames
        }))
      }, null, 2))
    }
  } else {
    throw new Error(`Unknown action: ${action}`)
  }
} finally {
  await client.close()
}
