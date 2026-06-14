export type IntegrationStepStatus = 'succeeded' | 'failed' | 'skipped' | 'retryable'

export type IntegrationStepName =
  | 'foxy_webhook_received'
  | 'foxy_webhook_rejected'
  | 'checkout_event_ingested'
  | 'checkout_event_duplicate'
  | 'handoff_registered'
  | 'handoff_reconcile_attempted'
  | 'crm_sync_dispatched'
  | 'crm_sync_completed'
  | string

export interface IntegrationStepSummary {
  integration_step_log_id: number
  donation_attempt_id: string | null
  step: IntegrationStepName
  status: IntegrationStepStatus
  producer: string
  summary: string
  error_code: string | null
  occurrence_count: number
  checkout_event_id: number | null
  checkout_handoff_id: number | null
  crm_sync_attempt_id: number | null
  recorded_at: string | null
}
