import test from 'node:test'
import assert from 'node:assert/strict'

import { createLiveUpdateGuard, patchHtml } from '../src/shared/ui/dom.js'

class FakeEventTarget {
  constructor() {
    this.listeners = new Map()
  }

  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) || []
    this.listeners.set(type, listeners.filter(item => item !== listener))
  }

  emit(type, event = {}) {
    for (const listener of this.listeners.get(type) || []) {
      listener({ type, ...event })
    }
  }
}

class FakeElement {
  constructor({ row = false } = {}) {
    this.row = row
    this.parentElement = null
  }

  append(child) {
    child.parentElement = this
  }

  contains(target) {
    let current = target
    while (current) {
      if (current === this) return true
      current = current.parentElement
    }
    return false
  }

  closest(selector) {
    if (selector === '[data-row]' && this.row) return this
    return this.parentElement?.closest(selector) || null
  }
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

test('patchHtml skips identical HTML without replacing children', () => {
  const child = { stable: true }
  const target = {
    innerHTML: '<p>same</p>',
    firstChild: child
  }
  let afterPatchCalls = 0

  const result = patchHtml(target, '<p>same</p>', {
    afterPatch() {
      afterPatchCalls += 1
    }
  })

  assert.equal(result, target)
  assert.equal(target.firstChild, child)
  assert.equal(afterPatchCalls, 0)
})

test('live update guard runs updates immediately when no pointer gesture is active', () => {
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement

  try {
    const documentRef = new FakeEventTarget()
    const windowRef = new FakeEventTarget()
    const root = new FakeElement()
    const guard = createLiveUpdateGuard({
      getTarget: () => root,
      interactiveSelector: '[data-row]',
      documentRef,
      windowRef
    })
    const calls = []

    guard.run(() => calls.push('update'))

    assert.deepEqual(calls, ['update'])
    guard.destroy()
  } finally {
    globalThis.Element = previousElement
  }
})

test('live update guard defers updates until after pointerup releases the click cycle', async () => {
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement

  try {
    const documentRef = new FakeEventTarget()
    const windowRef = new FakeEventTarget()
    const root = new FakeElement()
    const row = new FakeElement({ row: true })
    root.append(row)
    const guard = createLiveUpdateGuard({
      getTarget: () => root,
      interactiveSelector: '[data-row]',
      documentRef,
      windowRef,
      maxDelayMs: 100,
      releaseDelayMs: 5
    })
    const calls = []

    documentRef.emit('pointerdown', { target: row, button: 0 })
    guard.run(() => calls.push('update'))
    documentRef.emit('pointerup', { target: row })

    assert.deepEqual(calls, [])
    await wait(20)
    assert.deepEqual(calls, ['update'])
    guard.destroy()
  } finally {
    globalThis.Element = previousElement
  }
})

test('live update guard flushes after click before the pointerup fallback timeout', async () => {
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement

  try {
    const documentRef = new FakeEventTarget()
    const windowRef = new FakeEventTarget()
    const root = new FakeElement()
    const row = new FakeElement({ row: true })
    root.append(row)
    const guard = createLiveUpdateGuard({
      getTarget: () => root,
      interactiveSelector: '[data-row]',
      documentRef,
      windowRef,
      maxDelayMs: 100,
      releaseDelayMs: 100
    })
    const calls = []

    documentRef.emit('pointerdown', { target: row, button: 0 })
    guard.run(() => calls.push('update'))
    documentRef.emit('pointerup', { target: row })
    await wait(20)
    assert.deepEqual(calls, [])

    documentRef.emit('click', { target: row })
    await wait(20)
    assert.deepEqual(calls, ['update'])
    guard.destroy()
  } finally {
    globalThis.Element = previousElement
  }
})

test('live update guard keeps only the latest pending update and flushes on safety timeout', async () => {
  const previousElement = globalThis.Element
  globalThis.Element = FakeElement

  try {
    const documentRef = new FakeEventTarget()
    const windowRef = new FakeEventTarget()
    const root = new FakeElement()
    const row = new FakeElement({ row: true })
    root.append(row)
    const guard = createLiveUpdateGuard({
      getTarget: () => root,
      interactiveSelector: '[data-row]',
      documentRef,
      windowRef,
      maxDelayMs: 20,
      releaseDelayMs: 5
    })
    const calls = []

    documentRef.emit('pointerdown', { target: row, button: 0 })
    guard.run(() => calls.push('first'))
    guard.run(() => calls.push('second'))

    await wait(50)
    assert.deepEqual(calls, ['second'])
    guard.destroy()
  } finally {
    globalThis.Element = previousElement
  }
})
