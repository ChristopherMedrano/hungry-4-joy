<?php

namespace App\Services\Foxy;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use App\Services\CheckoutEventIngestor;
use App\Services\CheckoutHandoffLinker;
use Illuminate\Support\Carbon;

class FoxyReconciliationService
{
    public function __construct(
        private readonly FoxyApiClient $foxyApi,
        private readonly FoxyTransactionMapper $mapper,
        private readonly CheckoutEventIngestor $ingestor,
        private readonly CheckoutHandoffLinker $linker,
    ) {}

    public function reconcile(CheckoutHandoff $handoff): CheckoutHandoff
    {
        $handoff->refresh();

        if ($handoff->isTerminal()) {
            return $handoff;
        }

        if ($handoff->checkout_event_id !== null) {
            $handoff->update([
                'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
                'next_reconcile_at' => null,
            ]);

            return $handoff->fresh();
        }

        $existingEvent = CheckoutEvent::query()
            ->where('donation_attempt_id', $handoff->donation_attempt_id)
            ->first();

        if ($existingEvent instanceof CheckoutEvent) {
            $this->linker->linkHandoff($handoff, $existingEvent, $existingEvent->transaction_id, 'existing_checkout_event');

            return $handoff->fresh();
        }

        if ($this->shouldAbandon($handoff)) {
            $handoff->update([
                'handoff_status' => CheckoutHandoff::STATUS_ABANDONED,
                'reconciliation_note' => 'no_foxy_transaction_within_window',
                'next_reconcile_at' => null,
            ]);

            return $handoff->fresh();
        }

        if (! $this->foxyApi->configured()) {
            $this->scheduleRetry($handoff, 'foxy_api_not_configured');

            return $handoff->fresh();
        }

        try {
            $transaction = $this->foxyApi->findTransactionByDonationAttemptId($handoff->donation_attempt_id);
        } catch (\Throwable) {
            $this->scheduleRetry($handoff, 'foxy_api_error');

            return $handoff->fresh();
        }

        if ($transaction === null) {
            $this->scheduleRetry($handoff, 'foxy_transaction_not_found');

            return $handoff->fresh();
        }

        try {
            $normalized = $this->mapper->toCheckoutEvent($transaction, 'reconcile');
        } catch (\InvalidArgumentException) {
            $this->scheduleRetry($handoff, 'foxy_payload_invalid');

            return $handoff->fresh();
        }

        $result = $this->ingestor->ingest($normalized);
        $checkoutEvent = $result['checkout_event'];

        if (! $checkoutEvent instanceof CheckoutEvent) {
            $checkoutEvent = CheckoutEvent::query()
                ->where('donation_attempt_id', $handoff->donation_attempt_id)
                ->orWhere('transaction_id', (string) ($transaction['id'] ?? ''))
                ->first();
        }

        if ($checkoutEvent instanceof CheckoutEvent) {
            $this->linker->linkHandoff(
                $handoff,
                $checkoutEvent,
                (string) ($transaction['id'] ?? null),
                $result['status'],
            );
        } else {
            $this->scheduleRetry($handoff, 'checkout_event_missing_after_ingest');
        }

        return $handoff->fresh();
    }

    /**
     * @return int Number of handoffs processed.
     */
    public function reconcileDueHandoffs(?int $limit = null): int
    {
        $query = CheckoutHandoff::query()
            ->whereNotIn('handoff_status', [
                CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
                CheckoutHandoff::STATUS_ABANDONED,
            ])
            ->where(function ($builder): void {
                $builder->whereNull('next_reconcile_at')
                    ->orWhere('next_reconcile_at', '<=', now());
            })
            ->orderBy('next_reconcile_at')
            ->orderBy('id');

        if ($limit !== null) {
            $query->limit($limit);
        }

        $processed = 0;

        foreach ($query->cursor() as $handoff) {
            $this->reconcile($handoff);
            $processed++;
        }

        return $processed;
    }

    private function shouldAbandon(CheckoutHandoff $handoff): bool
    {
        $abandonAfterHours = (int) config('checkout.handoff_abandon_after_hours', 24);
        $deadline = Carbon::parse($handoff->handoff_at)->addHours($abandonAfterHours);

        return now()->greaterThanOrEqualTo($deadline);
    }

    private function scheduleRetry(CheckoutHandoff $handoff, string $note): void
    {
        $attempts = $handoff->reconcile_attempts + 1;
        $backoffMinutes = config('checkout.handoff_reconcile_backoff_minutes', [2, 10, 60, 1440]);
        $index = min($attempts - 1, count($backoffMinutes) - 1);
        $delayMinutes = (int) ($backoffMinutes[$index] ?? end($backoffMinutes));

        $handoff->update([
            'reconcile_attempts' => $attempts,
            'next_reconcile_at' => now()->addMinutes($delayMinutes),
            'reconciliation_note' => $note,
        ]);
    }
}
