import type { ServerAnalyticsEventSummary } from './analytics'

export type CrmSyncStatus =
  | 'not_applicable'
  | 'pending'
  | 'succeeded'
  | 'failed'
  | 'retryable'

export type CrmStatusSummary =
  | 'synced'
  | 'warning'
  | 'pending'
  | 'failed'
  | 'retryable'
  | 'not_applicable'

export type TransactionStatus = 'completed' | 'failed' | 'pending'

export type IngestChannel = 'fixture_receiver' | 'foxy_webhook'

export type HubSpotMode = 'fake' | 'live'

export interface CrmSyncSummary {
  eligible: boolean
  status: CrmSyncStatus
  retry_count: number
  last_attempted_at: string | null
  next_retry_at: string | null
  error_code: string | null
}

export interface CrmSyncDetail extends CrmSyncSummary {
  crm_sync_attempt_id: number | null
  hubspot_contact_id: string | null
  hubspot_deal_id: string | null
  hubspot_donation_attempt_id: string | null
  error_message: string | null
  hubspot_mode: HubSpotMode
}

export interface CheckoutEventSummary {
  checkout_event_id: number
  event_id: string
  donation_attempt_id: string | null
  event_type: string
  event_created_at: string
  transaction_status: TransactionStatus
  checkout_provider: string
  transaction_id: string | null
  source_page: string
  campaign: {
    campaign_id: string
    campaign_name: string
  }
  donation: {
    amount: number
    currency: string
    donation_label: string
    donation_type: string
  }
  donor: {
    email: string
    display_name: string
  }
  ingest: {
    received_at: string
    status: 'accepted'
    channel: IngestChannel
  }
  crm_sync: CrmSyncSummary
  crm_status_summary: CrmStatusSummary
}

export interface CheckoutEventDetail extends CheckoutEventSummary {
  checkout_session_id: string
  idempotency_key: string
  donor: CheckoutEventSummary['donor'] & {
    first_name: string
    last_name: string
    phone: string | null
  }
  failure: {
    failure_code: string | null
    failure_message: string | null
    provider_status: string | null
  }
  crm_sync: CrmSyncDetail
  timestamps: {
    updated_at: string
  }
  server_analytics_events: ServerAnalyticsEventSummary[]
}

export type DashboardDataMode =
  | 'hosted-api'
  | 'local-api'
  | 'seeded'
  | 'loading'
  | 'empty'
  | 'error'

/** @deprecated Use DashboardDataMode */
export type ShellViewState = DashboardDataMode

export interface EventFilters {
  campaign_id: string
  event_type: string
  transaction_status: string
  crm_sync_status: string
  ingest_channel: string
  search: string
}
