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
import {
  copyOperatorToken,
  generateOperatorToken,
  OPERATOR_TOKEN_BYTE_LENGTH,
  TokenCopyGuard,
} from '../src/lib/operatorToken.ts'

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

test('operator token generator requests 32 random bytes and returns header-safe lowercase hex', () => {
  let requestedBytes = 0
  const token = generateOperatorToken((bytes) => {
    requestedBytes = bytes.length
    bytes.forEach((_value, index) => {
      bytes[index] = index
    })
    return bytes
  })

  assert.equal(requestedBytes, OPERATOR_TOKEN_BYTE_LENGTH)
  assert.equal(token.length, 64)
  assert.match(token, /^[0-9a-f]{64}$/)
  assert.equal(token, '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f')
})

test('copy helper writes the exact token and surfaces clipboard failure without mutation', async () => {
  const token = 'ab'.repeat(OPERATOR_TOKEN_BYTE_LENGTH)
  let copied = ''

  await copyOperatorToken(token, {
    async writeText(value) {
      copied = value
    },
  })
  assert.equal(copied, token)

  await assert.rejects(
    copyOperatorToken(token, {
      async writeText() {
        throw new Error('permission denied')
      },
    }),
    /permission denied/,
  )
  assert.equal(token, 'ab'.repeat(OPERATOR_TOKEN_BYTE_LENGTH))
})

test('delayed clipboard completion cannot publish status after token edit or regeneration', async () => {
  const guard = new TokenCopyGuard()
  let currentToken = '11'.repeat(OPERATOR_TOKEN_BYTE_LENGTH)
  let finishCopy!: () => void

  const delayedCopy = guard.copy(currentToken, () => currentToken, {
    writeText() {
      return new Promise<void>((resolve) => {
        finishCopy = resolve
      })
    },
  })

  currentToken = '22'.repeat(OPERATOR_TOKEN_BYTE_LENGTH)
  guard.invalidate()
  finishCopy()

  assert.equal(await delayedCopy, 'stale')

  let failCopy!: (reason: Error) => void
  const delayedFailure = guard.copy(currentToken, () => currentToken, {
    writeText() {
      return new Promise<void>((_resolve, reject) => {
        failCopy = reject
      })
    },
  })

  currentToken = '33'.repeat(OPERATOR_TOKEN_BYTE_LENGTH)
  guard.invalidate()
  failCopy(new Error('clipboard permission changed'))

  assert.equal(await delayedFailure, 'stale')
})
