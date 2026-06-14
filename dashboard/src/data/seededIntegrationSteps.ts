import type { IntegrationStepSummary } from '../types/integration'

const declineSteps: IntegrationStepSummary[] = [
  {
    integration_step_log_id: 9001,
    donation_attempt_id: 'h4j_attempt_demo_unlinked_decline',
    step: 'handoff_registered',
    status: 'succeeded',
    producer: 'laravel_handoff',
    summary: 'Checkout handoff registered at donate click.',
    error_code: null,
    occurrence_count: 1,
    checkout_event_id: null,
    checkout_handoff_id: 101,
    crm_sync_attempt_id: null,
    recorded_at: '2026-06-12T10:34:00+00:00',
  },
  {
    integration_step_log_id: 9002,
    donation_attempt_id: 'h4j_attempt_demo_unlinked_decline',
    step: 'handoff_reconcile_attempted',
    status: 'retryable',
    producer: 'laravel_reconcile',
    summary: 'Reconcile attempt scheduled: foxy_transaction_not_found',
    error_code: 'foxy_transaction_not_found',
    occurrence_count: 2,
    checkout_event_id: null,
    checkout_handoff_id: 101,
    crm_sync_attempt_id: null,
    recorded_at: '2026-06-12T10:36:00+00:00',
  },
]

const abandonedSteps: IntegrationStepSummary[] = [
  {
    integration_step_log_id: 9003,
    donation_attempt_id: 'h4j_attempt_demo_unlinked_abandoned',
    step: 'handoff_registered',
    status: 'succeeded',
    producer: 'laravel_handoff',
    summary: 'Checkout handoff registered at donate click.',
    error_code: null,
    occurrence_count: 1,
    checkout_event_id: null,
    checkout_handoff_id: 102,
    crm_sync_attempt_id: null,
    recorded_at: '2026-06-11T08:00:00+00:00',
  },
  {
    integration_step_log_id: 9004,
    donation_attempt_id: 'h4j_attempt_demo_unlinked_abandoned',
    step: 'handoff_reconcile_attempted',
    status: 'retryable',
    producer: 'laravel_reconcile',
    summary: 'Reconcile attempt scheduled: foxy_transaction_not_found',
    error_code: 'foxy_transaction_not_found',
    occurrence_count: 5,
    checkout_event_id: null,
    checkout_handoff_id: 102,
    crm_sync_attempt_id: null,
    recorded_at: '2026-06-11T20:10:00+00:00',
  },
  {
    integration_step_log_id: 9005,
    donation_attempt_id: 'h4j_attempt_demo_unlinked_abandoned',
    step: 'handoff_reconcile_attempted',
    status: 'failed',
    producer: 'laravel_reconcile',
    summary: 'Handoff abandoned after reconciliation window.',
    error_code: 'no_foxy_transaction_within_window',
    occurrence_count: 1,
    checkout_event_id: null,
    checkout_handoff_id: 102,
    crm_sync_attempt_id: null,
    recorded_at: '2026-06-12T08:00:00+00:00',
  },
]

const seededIntegrationStepsByAttempt: Record<string, IntegrationStepSummary[]> = {
  h4j_attempt_demo_unlinked_decline: declineSteps,
  h4j_attempt_demo_unlinked_abandoned: abandonedSteps,
}

export function findSeededIntegrationSteps(
  donationAttemptId: string,
): IntegrationStepSummary[] {
  return seededIntegrationStepsByAttempt[donationAttemptId] ?? []
}
