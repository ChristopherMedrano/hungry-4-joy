<?php

namespace App\Support\Dashboard;

use App\Contracts\HubSpotClient;
use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;

class DashboardEventPresenter
{
    public function __construct(private readonly ?HubSpotClient $hubSpot = null) {}
    /**
     * @return array<string, mixed>
     */
    public function summary(CheckoutEvent $event): array
    {
        $crmSync = $this->crmSyncSummary($event);

        return [
            'checkout_event_id' => $event->id,
            'event_id' => $event->event_id,
            'donation_attempt_id' => $event->donation_attempt_id,
            'event_type' => $event->event_type,
            'event_created_at' => $event->event_created_at?->toIso8601String(),
            'transaction_status' => $event->transaction_status,
            'checkout_provider' => $event->checkout_provider,
            'transaction_id' => $event->transaction_id,
            'source_page' => $event->source_page,
            'campaign' => [
                'campaign_id' => $event->campaign_id,
                'campaign_name' => $event->campaign_name,
            ],
            'donation' => [
                'amount' => (float) $event->donation_amount,
                'currency' => $event->donation_currency,
                'donation_label' => $event->donation_label,
                'donation_type' => $event->donation_type,
            ],
            'donor' => [
                'email' => $event->donor_email,
                'display_name' => trim($event->donor_first_name.' '.$event->donor_last_name),
            ],
            'ingest' => [
                'received_at' => $event->created_at?->toIso8601String(),
                'status' => 'accepted',
                'channel' => $this->ingestChannel($event),
            ],
            'crm_sync' => $crmSync,
            'crm_status_summary' => $this->crmStatusSummary($event, $crmSync),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(CheckoutEvent $event): array
    {
        $summary = $this->summary($event);
        $eligible = $event->hubSpotSyncEligible();
        $attempt = $event->relationLoaded('crmSyncAttempt')
            ? $event->crmSyncAttempt
            : null;

        $summary['checkout_session_id'] = $event->checkout_session_id;
        $summary['idempotency_key'] = $event->idempotency_key;
        $summary['donor'] = [
            'email' => $event->donor_email,
            'display_name' => trim($event->donor_first_name.' '.$event->donor_last_name),
            'first_name' => $event->donor_first_name,
            'last_name' => $event->donor_last_name,
            'phone' => $event->donor_phone,
        ];
        $summary['failure'] = [
            'failure_code' => $event->failure_code,
            'failure_message' => $event->failure_message,
            'provider_status' => $event->failure_provider_status,
        ];
        $summary['crm_sync'] = array_merge($summary['crm_sync'], [
            'crm_sync_attempt_id' => $attempt?->id,
            'hubspot_contact_id' => $eligible ? $attempt?->hubspot_contact_id : null,
            'hubspot_deal_id' => $eligible ? $attempt?->hubspot_deal_id : null,
            'hubspot_donation_attempt_id' => $eligible
                ? $this->resolveHubSpotDonationAttemptId($attempt)
                : null,
            'error_message' => $attempt?->error_message,
            'hubspot_mode' => $this->hubspotMode(),
        ]);
        $summary['timestamps'] = [
            'updated_at' => $event->updated_at?->toIso8601String(),
        ];
        $summary['server_analytics_events'] = $event->relationLoaded('serverAnalyticsEvents')
            ? $event->serverAnalyticsEvents
                ->map(fn ($record) => app(DashboardServerAnalyticsPresenter::class)->summary($record))
                ->values()
                ->all()
            : [];

        return $summary;
    }

    public function ingestChannel(CheckoutEvent $event): string
    {
        return str_starts_with($event->event_id, 'foxy_transaction_')
            ? 'foxy_webhook'
            : 'fixture_receiver';
    }

    /**
     * @return array<string, mixed>
     */
    public function crmSyncSummary(CheckoutEvent $event): array
    {
        if (! $event->hubSpotSyncEligible()) {
            return [
                'eligible' => false,
                'status' => 'not_applicable',
                'retry_count' => 0,
                'last_attempted_at' => null,
                'next_retry_at' => null,
                'error_code' => null,
            ];
        }

        $attempt = $event->relationLoaded('crmSyncAttempt')
            ? $event->crmSyncAttempt
            : null;

        if (! $attempt instanceof CrmSyncAttempt) {
            return [
                'eligible' => true,
                'status' => 'pending',
                'retry_count' => 0,
                'last_attempted_at' => null,
                'next_retry_at' => null,
                'error_code' => null,
            ];
        }

        return [
            'eligible' => true,
            'status' => $attempt->status,
            'retry_count' => $attempt->retry_count,
            'last_attempted_at' => $attempt->last_attempted_at?->toIso8601String(),
            'next_retry_at' => $attempt->next_retry_at?->toIso8601String(),
            'error_code' => $attempt->error_code,
        ];
    }

    /**
     * @param  array<string, mixed>  $crmSync
     */
    public function crmStatusSummary(CheckoutEvent $event, array $crmSync): string
    {
        if (! $crmSync['eligible']) {
            return 'not_applicable';
        }

        return match ($crmSync['status']) {
            'succeeded' => $crmSync['error_code'] === 'hubspot_list_warning'
                ? 'warning'
                : 'synced',
            'pending' => 'pending',
            'failed' => 'failed',
            'retryable' => 'retryable',
            default => 'not_applicable',
        };
    }

    public function hubspotMode(): string
    {
        $enabled = (bool) config('services.hubspot.enabled');
        $accessToken = config('services.hubspot.access_token');

        return $enabled && filled($accessToken) ? 'live' : 'fake';
    }

    private function resolveHubSpotDonationAttemptId(?CrmSyncAttempt $attempt): ?string
    {
        if (! $attempt instanceof CrmSyncAttempt || ! filled($attempt->hubspot_deal_id)) {
            return null;
        }

        try {
            $fromHubSpot = $this->hubSpotClient()->getDealDonationAttemptId((string) $attempt->hubspot_deal_id);

            if (filled($fromHubSpot)) {
                return $fromHubSpot;
            }
        } catch (\Throwable) {
            // Fall back to the last stored value from sync.
        }

        return filled($attempt->hubspot_donation_attempt_id)
            ? $attempt->hubspot_donation_attempt_id
            : null;
    }

    private function hubSpotClient(): HubSpotClient
    {
        return $this->hubSpot ?? app(HubSpotClient::class);
    }
}
