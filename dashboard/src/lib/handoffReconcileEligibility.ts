import type { HandoffSummary } from '../types/handoff'

export type HandoffReconcileUiState =
  | { kind: 'eligible'; label: string }
  | { kind: 'ineligible'; reason: string }

export function handoffReconcileUiState(handoff: HandoffSummary | null): HandoffReconcileUiState {
  if (!handoff) {
    return { kind: 'ineligible', reason: 'No checkout handoff is linked to this attempt.' }
  }

  if (
    handoff.status === 'checkout_event_reconciled' ||
    handoff.status === 'abandoned'
  ) {
    return {
      kind: 'ineligible',
      reason:
        handoff.status === 'abandoned'
          ? 'This handoff is terminal after the reconciliation window expired.'
          : 'This handoff is already linked to a checkout event.',
    }
  }

  return { kind: 'eligible', label: 'Run reconcile now' }
}

export function isAttemptIdQuery(value: string): boolean {
  return /^h4j_attempt_[A-Za-z0-9_-]+$/.test(value.trim())
}

export function isCartIdQuery(value: string): boolean {
  return /^\d+$/.test(value.trim())
}
