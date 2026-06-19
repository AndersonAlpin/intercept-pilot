#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { BRIDGE_PORT } from './protocol.js'
import { createMcpServer } from './mcp-server.js'
import { createExtensionBridge } from './websocket-bridge.js'

function parseCliArgs(argv = []) {
  const options = {
    port: BRIDGE_PORT,
    token: ''
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--port' && argv[i + 1]) {
      options.port = Number(argv[i + 1]) || BRIDGE_PORT
      i += 1
    } else if (arg === '--token' && argv[i + 1]) {
      options.token = String(argv[i + 1] || '')
      i += 1
    }
  }

  return options
}

function createStderrLogger() {
  return {
    info: message => console.error(`[interceptpilot-mcp] ${message}`),
    warn: message => console.error(`[interceptpilot-mcp] ${message}`),
    error: message => console.error(`[interceptpilot-mcp] ${message}`)
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv)
  const bridge = createExtensionBridge({
    port: options.port,
    expectedToken: options.token,
    logger: createStderrLogger()
  })
  bridge.start()

  const server = createMcpServer({ bridge })
  const transport = new StdioServerTransport()

  process.on('SIGINT', async () => {
    await bridge.close()
    await server.close()
    process.exit(0)
  })

  await server.connect(transport)
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] === currentFile) {
  main().catch(error => {
    console.error(`[interceptpilot-mcp] ${String(error?.message || 'Failed to start InterceptPilot MCP server.')}`)
    process.exit(1)
  })
}
