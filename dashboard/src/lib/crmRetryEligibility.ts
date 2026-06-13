import type { CrmStatusSummary, CrmSyncDetail } from '../types/dashboard'

export type CrmRetryUiState =
  | { kind: 'eligible'; label: string }
  | { kind: 'ineligible'; reason: string }

export function crmRetryUiState(
  summary: CrmStatusSummary,
  crmSync: CrmSyncDetail,
): CrmRetryUiState {
  if (!crmSync.eligible || crmSync.crm_sync_attempt_id === null) {
    return { kind: 'ineligible', reason: 'CRM sync does not apply to this event.' }
  }

  if (crmSync.status === 'pending') {
    return { kind: 'ineligible', reason: 'A sync attempt is already in progress.' }
  }

  if (summary === 'retryable' || summary === 'failed') {
    return {
      kind: 'eligible',
      label: summary === 'failed' ? 'Retry sync' : 'Retry sync now',
    }
  }

  if (summary === 'warning') {
    return { kind: 'eligible', label: 'Retry list enrollment' }
  }

  if (summary === 'synced') {
    return { kind: 'ineligible', reason: 'This donation is already synced to HubSpot.' }
  }

  return { kind: 'ineligible', reason: 'Manual retry is not available for this state.' }
}
