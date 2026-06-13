import type { CheckoutEventSummary, CrmStatusSummary } from '../types/dashboard'

type EventStatusInput = Omit<CheckoutEventSummary, 'crm_status_summary'> &
  Partial<Pick<CheckoutEventSummary, 'crm_status_summary'>>

export function deriveCrmStatusSummary(event: EventStatusInput): CrmStatusSummary {
  if (event.crm_status_summary) {
    return event.crm_status_summary
  }

  if (!event.crm_sync.eligible) {
    return 'not_applicable'
  }

  switch (event.crm_sync.status) {
    case 'succeeded':
      return event.crm_sync.error_code === 'hubspot_list_warning' ? 'warning' : 'synced'
    case 'pending':
      return 'pending'
    case 'failed':
      return 'failed'
    case 'retryable':
      return 'retryable'
    default:
      return 'not_applicable'
  }
}

export function normalizeEventSummary<T extends EventStatusInput>(event: T): T & CheckoutEventSummary {
  return {
    ...event,
    crm_status_summary: deriveCrmStatusSummary(event),
  }
}
