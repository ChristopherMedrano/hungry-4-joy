<?php

namespace App\Support\Dashboard;

use App\Models\ServerAnalyticsEvent;

class DashboardServerAnalyticsPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(ServerAnalyticsEvent $record): array
    {
        $payload = $record->payload;
        $checkout = $record->relationLoaded('checkoutEvent') ? $record->checkoutEvent : null;

        return [
            'server_analytics_event_id' => $record->id,
            'analytics_event_id' => $record->analytics_event_id,
            'event' => $record->event,
            'event_created_at' => $payload['event_created_at'] ?? $record->created_at?->toIso8601String(),
            'producer' => $payload['producer'] ?? 'server',
            'donation_attempt_id' => $record->donation_attempt_id,
            'stored_checkout_event_id' => $checkout?->event_id,
            'checkout_event_row_id' => $record->checkout_event_id,
            'campaign_id' => $payload['campaign_id'] ?? null,
            'campaign_name' => $payload['campaign_name'] ?? null,
            'transaction_status' => $payload['transaction_status'] ?? null,
            'crm_sync_status' => $payload['crm_sync_status'] ?? null,
            'crm_error_code' => $payload['crm_error_code'] ?? null,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function detail(ServerAnalyticsEvent $record): array
    {
        return array_merge($this->summary($record), [
            'payload' => $record->payload,
            'recorded_at' => $record->created_at?->toIso8601String(),
        ]);
    }
}
