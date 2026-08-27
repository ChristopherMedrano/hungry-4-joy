import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  closeAttemptTraceModal,
  closedAttemptTraceModal,
  openAttemptTraceFromLookup,
  openAttemptTraceFromSelection,
  shouldAutoLoadAttemptTrace,
} from '../src/lib/attemptTraceSelection.ts'

test('lookup trace stays authoritative until close, then table selection auto-loads', () => {
  let modal = closedAttemptTraceModal
  assert.equal(modal.isOpen, false)

  modal = openAttemptTraceFromLookup()
  assert.deepEqual(modal, { isOpen: true, source: 'lookup' })
  assert.equal(shouldAutoLoadAttemptTrace(modal, 'h4j_attempt_declined'), false)

  modal = closeAttemptTraceModal()
  assert.deepEqual(modal, { isOpen: false, source: 'selection' })
  assert.equal(shouldAutoLoadAttemptTrace(modal, 'h4j_attempt_declined'), false)

  modal = openAttemptTraceFromSelection()
  assert.deepEqual(modal, { isOpen: true, source: 'selection' })
  assert.equal(shouldAutoLoadAttemptTrace(modal, 'h4j_attempt_selected'), true)
})

test('selection modal does not auto-load without an active attempt', () => {
  assert.equal(shouldAutoLoadAttemptTrace(openAttemptTraceFromSelection(), null), false)
})
