import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import {
  assertDashboardResponseCurrent,
  dashboardAccessGeneration,
  isDashboardRequestCancelled,
  operatorAuthenticatedFetch,
  setDashboardOperatorToken,
  setOperatorUnauthorizedHandler,
} from '../src/api/operatorAccess.ts'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  setOperatorUnauthorizedHandler(null)
  setDashboardOperatorToken(null)
})

test('operator fetch sends the runtime bearer token and relocks on 401', async () => {
  let unauthorized = false
  let observedAuthorization: string | null = null

  setDashboardOperatorToken('runtime-test-token')
  setOperatorUnauthorizedHandler(() => {
    unauthorized = true
  })
  globalThis.fetch = async (_input, init) => {
    observedAuthorization = new Headers(init?.headers).get('Authorization')
    return new Response(JSON.stringify({ message: 'Authentication required.' }), { status: 401 })
  }

  await assert.rejects(operatorAuthenticatedFetch('/api/dashboard/events'), (error) => {
    assert.equal(isDashboardRequestCancelled(error), true)
    return true
  })

  assert.equal(observedAuthorization, 'Bearer runtime-test-token')
  assert.equal(unauthorized, true)
})

test('locking aborts requests created by the previous access generation', async () => {
  setDashboardOperatorToken('first-runtime-token')
  const startedGeneration = dashboardAccessGeneration()

  globalThis.fetch = (_input, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        reject(new DOMException('Request aborted', 'AbortError'))
      })
    })

  const pending = operatorAuthenticatedFetch('/api/dashboard/events')
  setDashboardOperatorToken(null)

  await assert.rejects(pending, (error) => {
    assert.equal(isDashboardRequestCancelled(error), true)
    return true
  })
  assert.notEqual(dashboardAccessGeneration(), startedGeneration)
})

test('a response from an old generation cannot be consumed after token replacement', async () => {
  setDashboardOperatorToken('first-runtime-token')
  globalThis.fetch = async () => new Response(JSON.stringify({ data: [] }), { status: 200 })

  const response = await operatorAuthenticatedFetch('/api/dashboard/events')
  setDashboardOperatorToken('replacement-runtime-token')

  assert.throws(() => assertDashboardResponseCurrent(response), (error) => {
    assert.equal(isDashboardRequestCancelled(error), true)
    return true
  })
})
