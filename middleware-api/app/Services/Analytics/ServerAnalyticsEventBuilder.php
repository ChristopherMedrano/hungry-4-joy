<?php

namespace App\Services\Analytics;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use Illuminate\Support\Str;

class ServerAnalyticsEventBuilder
{
    /**
     * @return array<string, mixed>|null
     */
    public function fromCheckoutEvent(CheckoutEvent $event): ?array
    {
        $analyticsEvent = match (true) {
            $event->event_type === 'donation.created' && $event->transaction_status === 'completed' => 'DonationCompleted',
            $event->event_type === 'payment.failed' || $event->transaction_status === 'failed' => 'PaymentFailed',
            default => null,
        };

        if ($analyticsEvent === null) {
            return null;
        }

        $payload = array_merge(
            $this->sharedCheckoutFields($event),
            [
                'event' => $analyticsEvent,
                'transaction_status' => $event->transaction_status,
            ],
        );

        if (filled($event->transaction_id)) {
            $payload['transaction_id'] = $event->transaction_id;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function fromCrmSyncAttempt(CheckoutEvent $event, CrmSyncAttempt $attempt): ?array
    {
        $analyticsEvent = match (true) {
            $attempt->status === 'succeeded' && $attempt->error_code === null => 'HubSpotSyncSucceeded',
            $attempt->status === 'failed',
            $attempt->status === 'retryable',
            $attempt->status === 'succeeded' && $attempt->error_code === 'hubspot_list_warning' => 'HubSpotSyncFailed',
            default => null,
        };

        if ($analyticsEvent === null) {
            return null;
        }

        $payload = array_merge(
            $this->sharedCheckoutFields($event),
            [
                'event' => $analyticsEvent,
                'transaction_status' => $event->transaction_status,
                'crm_sync_status' => $this->crmSyncStatus($attempt),
            ],
        );

        if (filled($attempt->error_code)) {
            $payload['crm_error_code'] = $attempt->error_code;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function sharedCheckoutFields(CheckoutEvent $event): array
    {
        return [
            'donation_attempt_id' => $event->donation_attempt_id,
            'checkout_event_id' => $event->event_id,
            'campaign_id' => $event->campaign_id,
            'campaign_name' => $event->campaign_name,
            'donation_amount' => (float) $event->donation_amount,
            'donation_currency' => $event->donation_currency,
            'donation_label' => $event->donation_label,
            'donation_type' => $event->donation_type,
            'source_page' => $event->source_page,
            'checkout_provider' => $event->checkout_provider,
        ];
    }

    private function crmSyncStatus(CrmSyncAttempt $attempt): string
    {
        if ($attempt->status === 'succeeded' && $attempt->error_code === 'hubspot_list_warning') {
            return 'succeeded';
        }

        return $attempt->status;
    }

    public function createAnalyticsEventId(string $eventName): string
    {
        return 'anl_h4j_server_'.Str::lower(Str::replace('-', '_', Str::slug($eventName))).'_'.Str::uuid();
    }
}
