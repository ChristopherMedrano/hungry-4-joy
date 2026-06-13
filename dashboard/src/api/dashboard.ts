import { normalizeEventSummary } from '../lib/eventStatus'
import type {
  CheckoutEventDetail,
  CheckoutEventSummary,
  EventFilters,
} from '../types/dashboard'
import type {
  AnalyticsFilters,
  ServerAnalyticsEventDetail,
  ServerAnalyticsEventSummary,
} from '../types/analytics'

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
  options?: { retryActivity?: boolean },
): Promise<DashboardListResponse> {
  const params = toQuery(filters, page)
  const query = options?.retryActivity ? `${params}&retry_activity=1` : params
  const response = await fetch(`${apiUrl('/api/dashboard/events')}?${query}`)

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

export interface DashboardAnalyticsListResponse {
  data: ServerAnalyticsEventSummary[]
  meta: {
    current_page: number
    per_page: number
    total: number
    last_page: number
  }
  filters: Record<string, string | null>
}

export interface DashboardAnalyticsDetailResponse {
  data: ServerAnalyticsEventDetail
}

function analyticsQuery(filters: AnalyticsFilters, page = 1): string {
  const params = new URLSearchParams()

  if (filters.event) {
    params.set('event', filters.event)
  }

  if (filters.search) {
    params.set('search', filters.search)
  }

  params.set('page', String(page))
  params.set('per_page', '25')
  params.set('sort', '-created_at')

  return params.toString()
}

export async function fetchDashboardAnalyticsEvents(
  filters: AnalyticsFilters,
  page = 1,
): Promise<DashboardAnalyticsListResponse> {
  const response = await fetch(
    `${apiUrl('/api/dashboard/analytics-events')}?${analyticsQuery(filters, page)}`,
  )

  return parseJsonOrThrow<DashboardAnalyticsListResponse>(response)
}

export async function fetchDashboardAnalyticsEventDetail(
  serverAnalyticsEventId: number,
): Promise<ServerAnalyticsEventDetail> {
  const response = await fetch(
    apiUrl(`/api/dashboard/analytics-events/${serverAnalyticsEventId}`),
  )
  const payload = await parseJsonOrThrow<DashboardAnalyticsDetailResponse>(response)

  return payload.data
}
