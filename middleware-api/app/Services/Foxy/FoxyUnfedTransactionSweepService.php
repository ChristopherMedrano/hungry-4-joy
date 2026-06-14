<?php

namespace App\Services\Foxy;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use App\Models\IntegrationStepLog;
use App\Services\CheckoutEventIngestor;
use App\Services\CheckoutHandoffLinker;
use App\Services\Integration\IntegrationStepLogger;
use Illuminate\Support\Carbon;

class FoxyUnfedTransactionSweepService
{
    public function __construct(
        private readonly FoxyApiClient $foxyApi,
        private readonly FoxyTransactionMapper $mapper,
        private readonly CheckoutEventIngestor $ingestor,
        private readonly CheckoutHandoffLinker $linker,
        private readonly IntegrationStepLogger $stepLogger,
    ) {}

    /**
     * @return array{
     *     scanned: int,
     *     ingested: int,
     *     linked: int,
     *     skipped_existing: int,
     *     skipped_no_attempt_id: int,
     *     errors: list<string>
     * }
     */
    public function sweep(?int $hours = null, ?int $limit = null): array
    {
        $summary = [
            'scanned' => 0,
            'ingested' => 0,
            'linked' => 0,
            'skipped_existing' => 0,
            'skipped_no_attempt_id' => 0,
            'errors' => [],
        ];

        if (! $this->foxyApi->configured()) {
            $summary['errors'][] = 'foxy_api_not_configured';

            return $summary;
        }

        $lookbackHours = $hours ?? (int) config('checkout.handoff_sweep_default_hours', 24);
        $lookbackHours = min(max($lookbackHours, 1), 168);
        $transactionLimit = $limit ?? (int) config('checkout.handoff_sweep_max_transactions', 50);
        $transactionLimit = min(max($transactionLimit, 1), 100);

        try {
            $transactions = $this->foxyApi->listUnfedTransactions(
                Carbon::now()->subHours($lookbackHours),
                $transactionLimit,
            );
        } catch (\Throwable $exception) {
            $summary['errors'][] = 'foxy_api_error';

            return $summary;
        }

        foreach ($transactions as $transaction) {
            $summary['scanned']++;

            try {
                $outcome = $this->processTransaction($transaction);

                if ($outcome === 'ingested') {
                    $summary['ingested']++;
                } elseif ($outcome === 'linked') {
                    $summary['linked']++;
                } elseif ($outcome === 'skipped_existing') {
                    $summary['skipped_existing']++;
                } else {
                    $summary['skipped_no_attempt_id']++;
                }
            } catch (\Throwable) {
                $summary['errors'][] = 'transaction_'.((string) ($transaction['id'] ?? 'unknown'));
            }
        }

        return $summary;
    }

    /**
     * @param  array<string, mixed>  $transaction
     */
    private function processTransaction(array $transaction): string
    {
        $attemptId = $this->foxyApi->donationAttemptIdFromTransaction($transaction);

        if ($attemptId === null) {
            return 'skipped_no_attempt_id';
        }

        $transactionId = (string) ($transaction['id'] ?? '');
        $existingEvent = CheckoutEvent::query()
            ->where(function ($query) use ($attemptId, $transactionId): void {
                $query->where('donation_attempt_id', $attemptId);

                if ($transactionId !== '') {
                    $query->orWhere('transaction_id', $transactionId);
                }
            })
            ->first();

        if ($existingEvent instanceof CheckoutEvent) {
            $handoff = CheckoutHandoff::query()
                ->where('donation_attempt_id', $attemptId)
                ->first();

            if ($handoff instanceof CheckoutHandoff && $handoff->checkout_event_id === null) {
                $this->linker->linkHandoff(
                    $handoff,
                    $existingEvent,
                    $transactionId !== '' ? $transactionId : null,
                    'sweep_unfed_existing_event',
                );

                return 'linked';
            }

            return 'skipped_existing';
        }

        $normalized = $this->mapper->toCheckoutEvent($transaction, 'sweep_unfed');
        $result = $this->ingestor->ingest($normalized);
        $checkoutEvent = $result['checkout_event'];

        if (! $checkoutEvent instanceof CheckoutEvent) {
            $checkoutEvent = CheckoutEvent::query()
                ->where(function ($query) use ($attemptId, $transactionId): void {
                    $query->where('donation_attempt_id', $attemptId);

                    if ($transactionId !== '') {
                        $query->orWhere('transaction_id', $transactionId);
                    }
                })
                ->first();
        }

        if (! $checkoutEvent instanceof CheckoutEvent) {
            throw new \RuntimeException('checkout_event_missing_after_ingest');
        }

        $this->stepLogger->record(
            IntegrationStepLog::STEP_CHECKOUT_EVENT_INGESTED,
            IntegrationStepLog::STATUS_SUCCEEDED,
            IntegrationStepLog::PRODUCER_LARAVEL_RECONCILE,
            'Checkout event ingested from unfed Foxy transaction sweep.',
            $attemptId,
            checkoutEventId: $checkoutEvent->id,
        );

        $handoff = CheckoutHandoff::query()
            ->where('donation_attempt_id', $attemptId)
            ->first();

        if (! $handoff instanceof CheckoutHandoff) {
            $handoff = $this->createHandoffFromNormalized($normalized, $attemptId);
        }

        $this->linker->linkHandoff(
            $handoff,
            $checkoutEvent,
            $transactionId !== '' ? $transactionId : null,
            'sweep_unfed',
        );

        return 'ingested';
    }

    /**
     * @param  array<string, mixed>  $normalized
     */
    private function createHandoffFromNormalized(array $normalized, string $attemptId): CheckoutHandoff
    {
        $campaign = is_array($normalized['campaign'] ?? null) ? $normalized['campaign'] : [];
        $donation = is_array($normalized['donation'] ?? null) ? $normalized['donation'] : [];

        return CheckoutHandoff::create([
            'donation_attempt_id' => $attemptId,
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => $normalized['event_created_at'] ?? now(),
            'next_reconcile_at' => null,
            'reconcile_attempts' => 0,
            'checkout_provider' => (string) ($normalized['checkout_provider'] ?? 'foxy'),
            'source_page' => (string) ($normalized['source_page'] ?? 'foxy_sweep'),
            'campaign_id' => (string) ($campaign['campaign_id'] ?? 'foxy-donation'),
            'campaign_name' => (string) ($campaign['campaign_name'] ?? 'Foxy Donation'),
            'donation_amount' => $donation['amount'] ?? 0,
            'donation_currency' => (string) ($donation['currency'] ?? 'USD'),
            'donation_label' => (string) ($donation['donation_label'] ?? 'Foxy donation'),
            'donation_type' => (string) ($donation['donation_type'] ?? 'one_time'),
        ]);
    }
}
