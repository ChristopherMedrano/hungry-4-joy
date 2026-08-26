export class DashboardRequestCancelledError extends Error {}

let operatorToken: string | null = null
let onOperatorUnauthorized: (() => void) | null = null
let accessGeneration = 0
const activeRequests = new Set<AbortController>()
const responseGenerations = new WeakMap<Response, number>()

export function setDashboardOperatorToken(token: string | null): void {
  accessGeneration += 1
  for (const controller of activeRequests) {
    controller.abort()
  }
  activeRequests.clear()
  operatorToken = token
}

export function dashboardAccessGeneration(): number {
  return accessGeneration
}

export function isCurrentDashboardAccessGeneration(generation: number): boolean {
  return generation === accessGeneration
}

export function isDashboardRequestCancelled(error: unknown): boolean {
  return (
    error instanceof DashboardRequestCancelledError ||
    (error instanceof DOMException && error.name === 'AbortError')
  )
}

export function setOperatorUnauthorizedHandler(handler: (() => void) | null): void {
  onOperatorUnauthorized = handler
}

export async function operatorAuthenticatedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  const generation = accessGeneration
  const controller = new AbortController()
  const headers = new Headers(init.headers)

  if (operatorToken) {
    headers.set('Authorization', `Bearer ${operatorToken}`)
  }

  activeRequests.add(controller)

  let response: Response
  try {
    response = await fetch(input, { ...init, headers, signal: controller.signal })
  } finally {
    activeRequests.delete(controller)
  }

  if (generation !== accessGeneration) {
    throw new DashboardRequestCancelledError('Dashboard access changed during the request.')
  }

  if (response.status === 401) {
    setDashboardOperatorToken(null)
    onOperatorUnauthorized?.()
    throw new DashboardRequestCancelledError('Dashboard access was rejected.')
  }

  responseGenerations.set(response, generation)

  return response
}

export function assertDashboardResponseCurrent(response: Response): void {
  const generation = responseGenerations.get(response)

  if (generation === undefined || generation !== accessGeneration) {
    throw new DashboardRequestCancelledError('Dashboard access changed while reading a response.')
  }
}
