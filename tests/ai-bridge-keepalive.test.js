import test from 'node:test'
import assert from 'node:assert/strict'

import { createAiBridgeKeepalive } from '../src/background/ai-bridge-keepalive.js'

function fakeAlarms() {
  const listeners = []
  return {
    created: [],
    cleared: [],
    listeners,
    create(name, info) { this.created.push({ name, info }) },
    clear(name) { this.cleared.push(name) },
    onAlarm: {
      addListener: fn => listeners.push(fn),
      removeListener: fn => {
        const i = listeners.indexOf(fn)
        if (i >= 0) listeners.splice(i, 1)
      }
    },
    fire(name) { listeners.forEach(fn => fn({ name })) }
  }
}

test('keepalive creates a recurring alarm and ticks on it', () => {
  const alarms = fakeAlarms()
  let ticks = 0
  const keepalive = createAiBridgeKeepalive({ alarms, onTick: () => { ticks += 1 } })

  keepalive.start()
  assert.equal(alarms.created.length, 1)
  assert.equal(alarms.created[0].name, 'ai-bridge-keepalive')

  alarms.fire('ai-bridge-keepalive')
  assert.equal(ticks, 1)
  alarms.fire('some-other-alarm')
  assert.equal(ticks, 1)
})

test('keepalive stop clears the alarm and detaches the listener', () => {
  const alarms = fakeAlarms()
  let ticks = 0
  const keepalive = createAiBridgeKeepalive({ alarms, onTick: () => { ticks += 1 } })

  keepalive.start()
  keepalive.stop()

  assert.deepEqual(alarms.cleared, ['ai-bridge-keepalive'])
  alarms.fire('ai-bridge-keepalive')
  assert.equal(ticks, 0)
})

test('keepalive is a no-op without an alarms API', () => {
  const keepalive = createAiBridgeKeepalive({ alarms: undefined, onTick: () => {} })
  assert.doesNotThrow(() => { keepalive.start(); keepalive.stop() })
})
