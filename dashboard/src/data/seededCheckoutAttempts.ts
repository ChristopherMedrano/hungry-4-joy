import type { CheckoutAttemptSummary } from '../types/handoff'

export const seededCheckoutAttempts: CheckoutAttemptSummary[] = [
  {
    donation_attempt_id: 'h4j_attempt_demo_unlinked_decline',
    handoff: {
      status: 'cart_handoff_created',
      handoff_at: '2026-06-12T10:34:00+00:00',
      checkout_provider: 'foxy',
      source_page: 'home',
      campaign: {
        campaign_id: 'loaves-campaign-01',
        campaign_name: 'Loaves 4 Joy',
      },
      donation: {
        amount: 10,
        currency: 'USD',
        donation_label: '1 loaf',
        donation_type: 'one_time',
      },
      reconciliation: {
        reconcile_attempts: 2,
        next_reconcile_at: '2026-06-12T10:36:00+00:00',
        foxy_transaction_id: null,
        checkout_event_id: null,
        note: 'foxy_transaction_not_found',
      },
    },
  },
  {
    donation_attempt_id: 'h4j_attempt_demo_unlinked_abandoned',
    handoff: {
      status: 'abandoned',
      handoff_at: '2026-06-11T08:00:00+00:00',
      checkout_provider: 'foxy',
      source_page: 'home',
      campaign: {
        campaign_id: 'fishes-campaign-01',
        campaign_name: 'Fishes 4 Joy',
      },
      donation: {
        amount: 25,
        currency: 'USD',
        donation_label: '3 fish',
        donation_type: 'one_time',
      },
      reconciliation: {
        reconcile_attempts: 8,
        next_reconcile_at: null,
        foxy_transaction_id: null,
        checkout_event_id: null,
        note: 'no_foxy_transaction_within_window',
      },
    },
  },
]
