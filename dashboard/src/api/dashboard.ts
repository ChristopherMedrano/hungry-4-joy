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

async function parseJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Dashboard API request failed with status ${response.status}.`)
  }

  return response.json() as Promise<T>
}

export async function fetchDashboardEvents(
  filters: EventFilters,
  page = 1,
): Promise<DashboardListResponse> {
  const response = await fetch(`/api/dashboard/events?${toQuery(filters, page)}`)

  const payload = await parseJson<DashboardListResponse>(response)

  return {
    ...payload,
    data: payload.data.map((event) => normalizeEventSummary(event)),
  }
}

export async function fetchDashboardEventDetail(
  checkoutEventId: number,
): Promise<CheckoutEventDetail> {
  const response = await fetch(`/api/dashboard/events/${checkoutEventId}`)
  const payload = await parseJson<DashboardDetailResponse>(response)

  return normalizeEventSummary(payload.data)
}
