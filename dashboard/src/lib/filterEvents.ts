import type { CheckoutEventDetail, EventFilters } from '../types/dashboard'

export const defaultFilters: EventFilters = {
  campaign_id: '',
  event_type: '',
  transaction_status: '',
  crm_sync_status: '',
  ingest_channel: '',
  search: '',
}

export function filterEvents(
  events: CheckoutEventDetail[],
  filters: EventFilters,
): CheckoutEventDetail[] {
  const search = filters.search.trim().toLowerCase()

  return events.filter((event) => {
    if (filters.campaign_id && event.campaign.campaign_id !== filters.campaign_id) {
      return false
    }

    if (filters.event_type && event.event_type !== filters.event_type) {
      return false
    }

    if (
      filters.transaction_status &&
      event.transaction_status !== filters.transaction_status
    ) {
      return false
    }

    if (filters.crm_sync_status && event.crm_sync.status !== filters.crm_sync_status) {
      return false
    }

    if (filters.ingest_channel && event.ingest.channel !== filters.ingest_channel) {
      return false
    }

    if (!search) {
      return true
    }

    const haystack = [
      event.donation_attempt_id,
      event.event_id,
      event.transaction_id,
      event.donor.email,
      event.donor.display_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })
}
