#!/usr/bin/env node

import { fileURLToPath } from 'node:url'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

import { BRIDGE_PORT } from './protocol.js'
import { createDaemonClientBridge } from './daemon-client.js'
import { createInterceptPilotDaemon } from './daemon.js'
import { createMcpServer } from './mcp-server.js'

export function parseCliArgs(argv = []) {
  const options = {
    mode: 'adapter',
    port: BRIDGE_PORT,
    key: '',
    daemonHost: '127.0.0.1',
    daemonAutostart: true
  }

  const args = [...argv]
  if (args[0] === 'daemon') {
    options.mode = 'daemon'
    args.shift()
  }

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i]
    if (arg === '--port' && args[i + 1]) {
      options.port = Number(args[i + 1]) || BRIDGE_PORT
      i += 1
    } else if (arg === '--key' && args[i + 1]) {
      options.key = String(args[i + 1] || '')
      i += 1
    } else if (arg === '--no-daemon-autostart') {
      options.daemonAutostart = false
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

export async function createRuntime(options, factories = {}) {
  const {
    createDaemonClientBridge: createDaemonClientBridgeFn = createDaemonClientBridge,
    createInterceptPilotDaemon: createInterceptPilotDaemonFn = createInterceptPilotDaemon,
    createMcpServer: createMcpServerFn = createMcpServer,
    StdioServerTransportCtor = StdioServerTransport,
    logger = createStderrLogger()
  } = factories

  if (options.mode === 'daemon') {
    const daemon = createInterceptPilotDaemonFn({
      port: options.port,
      expectedKey: options.key,
      logger
    })
    daemon.start()
    return {
      mode: 'daemon',
      daemon,
      close: () => daemon.close()
    }
  }

  const bridge = createDaemonClientBridgeFn({
    port: options.port,
    expectedKey: options.key,
    daemonAutostart: options.daemonAutostart,
    logger
  })
  await bridge.start()

  const server = createMcpServerFn({ bridge })
  const transport = new StdioServerTransportCtor()
  await server.connect(transport)

  return {
    mode: 'adapter',
    bridge,
    server,
    close: async () => {
      await bridge.close?.()
      await server.close?.()
    }
  }
}

export async function main(argv = process.argv.slice(2), factories = {}) {
  const runtime = await createRuntime(parseCliArgs(argv), factories)

  process.on('SIGINT', async () => {
    await runtime.close()
    process.exit(0)
  })

  return runtime
}

const currentFile = fileURLToPath(import.meta.url)
if (process.argv[1] === currentFile) {
  main().catch(error => {
    console.error(`[interceptpilot-mcp] ${String(error?.message || 'Failed to start InterceptPilot MCP server.')}`)
    process.exit(1)
  })
}
