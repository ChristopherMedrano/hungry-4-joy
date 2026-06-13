<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;
use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use App\Services\Analytics\ServerAnalyticsEmitter;
use Throwable;

class HubSpotDonationSyncer
{
    public function __construct(
        private readonly HubSpotClient $hubSpot,
        private readonly ServerAnalyticsEmitter $analyticsEmitter,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function sync(CheckoutEvent $event): array
    {
        if (! $event->hubSpotSyncEligible()) {
            return ['status' => 'skipped_ineligible'];
        }

        $attempt = CrmSyncAttempt::firstOrCreate(
            ['checkout_event_id' => $event->id],
            ['status' => 'pending']
        );

        if ($attempt->status === 'succeeded' && $attempt->error_code !== 'hubspot_list_warning') {
            return [
                'status' => 'already_synced',
                'contact_id' => $attempt->hubspot_contact_id,
                'deal_id' => $attempt->hubspot_deal_id,
            ];
        }

        if ($attempt->status === 'succeeded' && $attempt->error_code === 'hubspot_list_warning') {
            return $this->retryListEnrollment($event, $attempt);
        }

        $attempt->forceFill([
            'status' => 'pending',
            'error_code' => null,
            'error_message' => null,
            'last_attempted_at' => now(),
            'next_retry_at' => null,
        ])->save();

        try {
            $contactId = $this->hubSpot->upsertContact(
                $event->donor_email,
                $event->donor_first_name,
                $event->donor_last_name,
                $event->donor_phone,
            );

            $dealId = $this->hubSpot->createDeal($this->dealProperties($event));

            $this->hubSpot->associateDealToContact($dealId, $contactId);

            $hubspotAttemptId = $this->hubSpot->getDealDonationAttemptId($dealId);

            $listResult = $this->hubSpot->addContactToList(
                $contactId,
                (string) config('services.hubspot.newsletter_list_id', '12'),
            );
        } catch (Throwable $exception) {
            return $this->recordFailure($attempt, $exception);
        }

        $warning = $this->listWarning($listResult);
        $attempt->forceFill([
            'status' => 'succeeded',
            'hubspot_contact_id' => $contactId,
            'hubspot_deal_id' => $dealId,
            'hubspot_donation_attempt_id' => $hubspotAttemptId,
            'error_code' => $warning === null ? null : 'hubspot_list_warning',
            'error_message' => $warning,
            'last_attempted_at' => now(),
            'next_retry_at' => null,
        ])->save();

        $this->analyticsEmitter->emitCrmSyncConversion($event, $attempt->fresh() ?? $attempt);

        return [
            'status' => 'synced',
            'contact_id' => $contactId,
            'deal_id' => $dealId,
            'list_result' => $listResult,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function retryListEnrollment(CheckoutEvent $event, CrmSyncAttempt $attempt): array
    {
        if (! filled($attempt->hubspot_contact_id)) {
            return [
                'status' => 'already_synced',
                'contact_id' => $attempt->hubspot_contact_id,
                'deal_id' => $attempt->hubspot_deal_id,
            ];
        }

        $listResult = $this->hubSpot->addContactToList(
            (string) $attempt->hubspot_contact_id,
            (string) config('services.hubspot.newsletter_list_id', '12'),
        );

        $warning = $this->listWarning($listResult);
        $attempt->forceFill([
            'error_code' => $warning === null ? null : 'hubspot_list_warning',
            'error_message' => $warning,
            'retry_count' => $attempt->retry_count + 1,
            'last_attempted_at' => now(),
        ])->save();

        $this->analyticsEmitter->emitCrmSyncConversion($event, $attempt->fresh() ?? $attempt);

        return [
            'status' => $warning === null ? 'list_enrolled' : 'already_synced',
            'contact_id' => $attempt->hubspot_contact_id,
            'deal_id' => $attempt->hubspot_deal_id,
            'list_result' => $listResult,
        ];
    }

    private function recordFailure(CrmSyncAttempt $attempt, Throwable $exception): array
    {
        $retryable = $this->retryable($exception);
        $status = $retryable ? 'retryable' : 'failed';

        $attempt->forceFill([
            'status' => $status,
            'error_code' => $retryable ? 'hubspot_retryable_error' : 'hubspot_terminal_error',
            'error_message' => $this->safeErrorMessage($exception),
            'retry_count' => $attempt->retry_count + 1,
            'last_attempted_at' => now(),
            'next_retry_at' => $retryable ? now()->addMinutes(15) : null,
        ])->save();

        $checkoutEvent = $attempt->checkoutEvent;

        if ($checkoutEvent instanceof CheckoutEvent) {
            $this->analyticsEmitter->emitCrmSyncConversion($checkoutEvent, $attempt->fresh() ?? $attempt);
        }

        return [
            'status' => $status,
            'error_code' => $attempt->error_code,
            'error_message' => $attempt->error_message,
        ];
    }

    private function retryable(Throwable $exception): bool
    {
        return str_contains($exception->getMessage(), 'status 429')
            || str_contains($exception->getMessage(), 'status 408')
            || str_contains($exception->getMessage(), 'status 500')
            || str_contains($exception->getMessage(), 'status 502')
            || str_contains($exception->getMessage(), 'status 503')
            || str_contains($exception->getMessage(), 'status 504')
            || str_contains(strtolower($exception->getMessage()), 'timeout');
    }

    private function safeErrorMessage(Throwable $exception): string
    {
        $message = preg_replace('/Bearer\s+[A-Za-z0-9._~+\-\/]+=*/', 'Bearer [redacted]', $exception->getMessage()) ?? 'HubSpot sync failed.';
        $message = preg_replace('/pat-[A-Za-z0-9._~+\-]+/', 'pat-[redacted]', $message) ?? $message;

        return mb_substr($message, 0, 500);
    }

    /**
     * @param  array{ok: bool, error: string|null}  $listResult
     */
    private function listWarning(array $listResult): ?string
    {
        if ($listResult['ok']) {
            return null;
        }

        return $listResult['error'] === null
            ? 'HubSpot list enrollment failed.'
            : mb_substr($listResult['error'], 0, 500);
    }

    /**
     * @return array<string, mixed>
     */
    private function dealProperties(CheckoutEvent $event): array
    {
        return [
            'h4j_donation_attempt_id' => $event->donation_attempt_id,
            'dealname' => $event->campaign_name.' - '.$event->donation_label,
            'amount' => (float) $event->donation_amount,
            'deal_currency_code' => $event->donation_currency,
            'h4j_campaign_id' => $event->campaign_id,
            'h4j_campaign_name' => $event->campaign_name,
            'h4j_donation_label' => $event->donation_label,
            'h4j_donation_type' => $event->donation_type,
            'h4j_checkout_provider' => $event->checkout_provider,
            'h4j_transaction_id' => $event->transaction_id,
            'h4j_checkout_session_id' => $event->checkout_session_id,
            'h4j_source_page' => $event->source_page,
            'h4j_checkout_event_id' => $event->event_id,
            'closedate' => $event->event_created_at?->toIso8601String(),
        ];
    }
}
