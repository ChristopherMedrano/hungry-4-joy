import { normalizeEventSummary } from '../lib/eventStatus'
import type {
  CheckoutEventDetail,
  CheckoutEventSummary,
  EventFilters,
} from '../types/dashboard'

export interface DashboardListResponse {
  data: CheckoutEventSummary[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  filters: Record<string, string | null>
}

export interface DashboardDetailResponse {
  data: CheckoutEventDetail
}

export class DashboardApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let dashboardApiBase = ''

export function setDashboardApiBase(base: string): void {
  dashboardApiBase = base.replace(/\/$/, '')
}

function apiUrl(path: string): string {
  return `${dashboardApiBase}${path}`
}

function toQuery(filters: EventFilters, page = 1): string {
  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      params.set(key, value)
    }
  }

  params.set('page', String(page))
  params.set('per_page', '25')
  params.set('sort', '-event_created_at')

  return params.toString()
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => ({}))) as {
    message?: string
  }

  if (!response.ok) {
    throw new DashboardApiError(
      payload.message ?? `Dashboard API request failed with status ${response.status}.`,
      response.status,
    )
  }

  return payload as T
}

export async function fetchDashboardEvents(
  filters: EventFilters,
  page = 1,
): Promise<DashboardListResponse> {
  const response = await fetch(`${apiUrl('/api/dashboard/events')}?${toQuery(filters, page)}`)

  const payload = await parseJsonOrThrow<DashboardListResponse>(response)

  return {
    ...payload,
    data: payload.data.map((event) => normalizeEventSummary(event)),
  }
}

export async function fetchDashboardEventDetail(
  checkoutEventId: number,
): Promise<CheckoutEventDetail> {
  const response = await fetch(apiUrl(`/api/dashboard/events/${checkoutEventId}`))
  const payload = await parseJsonOrThrow<DashboardDetailResponse>(response)

  return normalizeEventSummary(payload.data)
}

export async function fetchCrmSyncRetry(
  crmSyncAttemptId: number,
): Promise<CheckoutEventDetail> {
  const response = await fetch(apiUrl(`/api/dashboard/crm-sync/${crmSyncAttemptId}/retry`), {
    method: 'POST',
    headers: { Accept: 'application/json' },
  })
  const payload = await parseJsonOrThrow<DashboardDetailResponse>(response)

  return normalizeEventSummary(payload.data)
}
