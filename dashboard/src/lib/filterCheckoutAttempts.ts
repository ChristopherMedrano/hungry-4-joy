import type { CheckoutAttemptsFilters, CheckoutAttemptSummary } from '../types/handoff'

export function filterCheckoutAttempts(
  attempts: CheckoutAttemptSummary[],
  filters: CheckoutAttemptsFilters,
): CheckoutAttemptSummary[] {
  const search = filters.search.trim().toLowerCase()

  if (!search) {
    return attempts
  }

  return attempts.filter((attempt) => {
    const haystack = [
      attempt.donation_attempt_id,
      attempt.handoff.campaign.campaign_name,
      attempt.handoff.campaign.campaign_id,
      attempt.handoff.reconciliation.note,
      attempt.handoff.status,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(search)
  })
}
