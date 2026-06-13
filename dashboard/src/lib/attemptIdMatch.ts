export function displayOptional(value: string | null | undefined): string {
  if (!value?.trim()) {
    return 'N/A'
  }

  return value
}

export type AttemptIdMatch = 'matched' | 'mismatch' | 'unavailable'

export function attemptIdMatch(
  checkoutAttemptId: string | null | undefined,
  hubspotAttemptId: string | null | undefined,
): AttemptIdMatch {
  const checkout = checkoutAttemptId?.trim()
  const hubspot = hubspotAttemptId?.trim()

  if (!checkout || !hubspot) {
    return 'unavailable'
  }

  return checkout === hubspot ? 'matched' : 'mismatch'
}

export const attemptIdMatchLabels: Record<AttemptIdMatch, string> = {
  matched: 'Matched',
  mismatch: 'Mismatch',
  unavailable: 'N/A',
}
