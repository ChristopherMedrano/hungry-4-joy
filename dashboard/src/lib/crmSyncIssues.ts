import type { CheckoutEventSummary } from '../types/dashboard'

export function hasCrmSyncIssue(event: CheckoutEventSummary): boolean {
  const { crm_sync: crmSync, crm_status_summary: summary } = event

  if (!crmSync.eligible) {
    return false
  }

  if (crmSync.retry_count > 0) {
    return true
  }

  if (summary === 'failed' || summary === 'retryable' || summary === 'warning') {
    return true
  }

  return crmSync.error_code === 'hubspot_list_warning'
}

export function filterCrmSyncIssuesBySearch(
  events: CheckoutEventSummary[],
  search: string,
): CheckoutEventSummary[] {
  const query = search.trim().toLowerCase()

  if (!query) {
    return events
  }

  return events.filter((event) => {
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

    return haystack.includes(query)
  })
}

export function sortByLastCrmAttempt(
  events: CheckoutEventSummary[],
): CheckoutEventSummary[] {
  return [...events].sort((left, right) => {
    const leftTime = left.crm_sync.last_attempted_at
      ? Date.parse(left.crm_sync.last_attempted_at)
      : 0
    const rightTime = right.crm_sync.last_attempted_at
      ? Date.parse(right.crm_sync.last_attempted_at)
      : 0

    return rightTime - leftTime
  })
}
