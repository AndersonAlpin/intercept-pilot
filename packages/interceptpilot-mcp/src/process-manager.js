import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

function createDefaultLogger() {
  return {
    info: message => console.error(`[interceptpilot-mcp] ${message}`),
    warn: message => console.error(`[interceptpilot-mcp] ${message}`),
    error: message => console.error(`[interceptpilot-mcp] ${message}`)
  }
}

export function getDefaultDaemonEntryPath() {
  return fileURLToPath(new URL('./index.js', import.meta.url))
}

export function startDaemonProcess(options = {}) {
  const {
    port,
    key = '',
    nodeExecPath = process.execPath,
    entryPath = getDefaultDaemonEntryPath(),
    spawnFn = spawn,
    logger = createDefaultLogger()
  } = options

  const args = [entryPath, 'daemon', '--port', String(port), '--key', String(key || '')]
  const child = spawnFn(nodeExecPath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })

  if (typeof child?.unref === 'function') child.unref()
  logger.info('Started InterceptPilot daemon process.')
  return child
}
