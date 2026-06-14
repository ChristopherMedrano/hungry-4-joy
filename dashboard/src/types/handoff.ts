export type HandoffStatus =
  | 'cart_handoff_created'
  | 'checkout_event_reconciled'
  | 'abandoned'

export type ReconciliationNote =
  | 'foxy_transaction_not_found'
  | 'foxy_api_not_configured'
  | 'foxy_api_error'
  | 'foxy_payload_invalid'
  | 'no_foxy_transaction_within_window'
  | 'checkout_event_missing_after_ingest'
  | string
  | null

export interface HandoffReconciliationSummary {
  reconcile_attempts: number
  next_reconcile_at: string | null
  foxy_transaction_id: string | null
  checkout_event_id: number | null
  note: ReconciliationNote
}

export interface HandoffSummary {
  status: HandoffStatus
  handoff_at: string | null
  checkout_provider: string
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
  reconciliation: HandoffReconciliationSummary
}

export interface FoxyCartItemSummary {
  name: string
  price: number | null
  quantity: number | null
  donation_attempt_id: string | null
}

export interface FoxyCartSummary {
  total_order: number | null
  total_item_price: number | null
  customer_email: string | null
  date_created: string | null
  date_modified: string | null
  item_count: number
  donation_attempt_ids: string[]
  items: FoxyCartItemSummary[]
}

export interface CheckoutAttemptSummary {
  donation_attempt_id: string
  handoff: HandoffSummary
}

export interface CheckoutAttemptsFilters {
  search: string
}

export interface AttemptTraceData {
  donation_attempt_id: string
  handoff: HandoffSummary | null
  checkout_event: import('./dashboard').CheckoutEventDetail | null
  integration_steps?: import('./integration').IntegrationStepSummary[]
  foxy_cart_id?: string
  donation_attempt_ids?: string[]
  foxy_cart?: FoxyCartSummary
}
