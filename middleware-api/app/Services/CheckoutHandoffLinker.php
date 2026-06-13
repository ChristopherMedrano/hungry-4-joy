<?php

namespace App\Services;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;

class CheckoutHandoffLinker
{
    public function linkFromCheckoutEvent(CheckoutEvent $event, ?string $foxyTransactionId = null): void
    {
        if ($event->donation_attempt_id === null || $event->donation_attempt_id === '') {
            return;
        }

        $handoff = CheckoutHandoff::query()
            ->where('donation_attempt_id', $event->donation_attempt_id)
            ->first();

        if (! $handoff instanceof CheckoutHandoff) {
            return;
        }

        if ($handoff->checkout_event_id !== null) {
            return;
        }

        $handoff->update([
            'checkout_event_id' => $event->id,
            'foxy_transaction_id' => $foxyTransactionId ?? $event->transaction_id,
            'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
            'reconciliation_note' => 'linked_from_checkout_event',
            'next_reconcile_at' => null,
        ]);
    }

    public function linkHandoff(CheckoutHandoff $handoff, CheckoutEvent $event, ?string $foxyTransactionId = null, ?string $note = null): void
    {
        $handoff->update([
            'checkout_event_id' => $event->id,
            'foxy_transaction_id' => $foxyTransactionId ?? $event->transaction_id,
            'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
            'reconciliation_note' => $note,
            'next_reconcile_at' => null,
        ]);
    }
}
