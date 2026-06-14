import type { HandoffStatus, ReconciliationNote } from '../types/handoff'
import { formatDashboardTimestamp } from './crmLabels'

export { formatDashboardTimestamp }

export const handoffStatusLabels: Record<HandoffStatus, string> = {
  cart_handoff_created: 'Handoff registered',
  checkout_event_reconciled: 'Reconciled',
  abandoned: 'Abandoned',
}

export const reconciliationNoteLabels: Record<string, string> = {
  foxy_transaction_not_found:
    'No Foxy transaction for this attempt yet. Common for gateway declines that only create a cart.',
  foxy_api_not_configured: 'Foxy hAPI credentials are not configured on middleware.',
  foxy_api_error: 'Foxy hAPI request failed. Automatic retry is scheduled.',
  foxy_payload_invalid: 'Foxy transaction found but payload mapping was rejected.',
  no_foxy_transaction_within_window:
    'No Foxy transaction was found within the reconciliation window.',
  checkout_event_missing_after_ingest:
    'Reconcile ingested a transaction but could not link a checkout event.',
}

export function reconciliationNoteLabel(note: ReconciliationNote): string | null {
  if (!note) {
    return null
  }

  return reconciliationNoteLabels[note] ?? note
}

/** Muted explanatory text under reconcile note codes in tables and detail rows. */
export const reconciliationNoteMeaningClass = 'text-xs text-slate-400'

export function handoffStatusTone(
  status: HandoffStatus,
  note: ReconciliationNote,
): 'emerald' | 'sky' | 'amber' | 'rose' | 'slate' {
  if (status === 'checkout_event_reconciled') {
    return 'emerald'
  }

  if (status === 'abandoned') {
    return 'slate'
  }

  if (note === 'foxy_transaction_not_found') {
    return 'amber'
  }

  if (note === 'foxy_api_error' || note === 'foxy_api_not_configured') {
    return 'rose'
  }

  return 'sky'
}
