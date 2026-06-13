export type ServerAnalyticsEventName =
  | 'DonationCompleted'
  | 'PaymentFailed'
  | 'HubSpotSyncSucceeded'
  | 'HubSpotSyncFailed'

export interface ServerAnalyticsEventSummary {
  server_analytics_event_id: number
  analytics_event_id: string
  event: ServerAnalyticsEventName | string
  event_created_at: string
  producer: 'server'
  donation_attempt_id: string | null
  stored_checkout_event_id: string | null
  checkout_event_row_id: number
  campaign_id: string | null
  campaign_name: string | null
  transaction_status: string | null
  crm_sync_status: string | null
  crm_error_code: string | null
}

export interface ServerAnalyticsEventDetail extends ServerAnalyticsEventSummary {
  payload: Record<string, unknown>
  recorded_at: string
}

export interface AnalyticsFilters {
  event: string
  search: string
}

export const defaultAnalyticsFilters: AnalyticsFilters = {
  event: '',
  search: '',
}
