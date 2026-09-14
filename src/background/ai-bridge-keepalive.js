const ALARM_NAME = 'ai-bridge-keepalive'

export function createAiBridgeKeepalive({ alarms, intervalMinutes = 0.5, onTick = () => {} } = {}) {
  let listener = null

  return {
    start() {
      if (!alarms) return
      alarms.create(ALARM_NAME, { periodInMinutes: intervalMinutes })
      if (!listener) {
        listener = alarm => {
          if (alarm?.name === ALARM_NAME) onTick()
        }
        alarms.onAlarm.addListener(listener)
      }
    },
    stop() {
      if (!alarms) return
      alarms.clear(ALARM_NAME)
      if (listener) {
        alarms.onAlarm.removeListener(listener)
        listener = null
      }
    }
  }
}
