import { uid } from '../shared/utils.js'
import { getLogs, setLogs } from '../shared/storage.js'

export async function pushLog(entry, maxLogs = 300) {
  const logs = await getLogs()
  const next = [{ id: uid('log'), timestamp: new Date().toISOString(), ...entry }, ...logs].slice(0, maxLogs)
  await setLogs(next)
  chrome.runtime.sendMessage({ type: 'state:logs', logs: next }).catch(() => {})
  return next
}
