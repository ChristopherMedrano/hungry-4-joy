<?php

namespace App\Support\Dashboard;

use App\Models\CheckoutHandoff;

class DashboardHandoffPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(CheckoutHandoff $handoff): array
    {
        return [
            'status' => $handoff->handoff_status,
            'handoff_at' => $handoff->handoff_at?->toIso8601String(),
            'checkout_provider' => $handoff->checkout_provider,
            'source_page' => $handoff->source_page,
            'campaign' => [
                'campaign_id' => $handoff->campaign_id,
                'campaign_name' => $handoff->campaign_name,
            ],
            'donation' => [
                'amount' => (float) $handoff->donation_amount,
                'currency' => $handoff->donation_currency,
                'donation_label' => $handoff->donation_label,
                'donation_type' => $handoff->donation_type,
            ],
            'reconciliation' => [
                'reconcile_attempts' => $handoff->reconcile_attempts,
                'next_reconcile_at' => $handoff->next_reconcile_at?->toIso8601String(),
                'foxy_transaction_id' => $handoff->foxy_transaction_id,
                'checkout_event_id' => $handoff->checkout_event_id,
                'note' => $handoff->reconciliation_note,
            ],
        ];
    }
}
