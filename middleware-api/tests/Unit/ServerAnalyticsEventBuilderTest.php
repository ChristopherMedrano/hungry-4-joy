<?php

namespace Tests\Unit;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use App\Services\Analytics\ServerAnalyticsEventBuilder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServerAnalyticsEventBuilderTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_donation_builds_donation_completed_payload(): void
    {
        $event = CheckoutEvent::create($this->checkoutAttributes([
            'event_type' => 'donation.created',
            'transaction_status' => 'completed',
        ]));

        $payload = app(ServerAnalyticsEventBuilder::class)->fromCheckoutEvent($event);

        $this->assertSame('DonationCompleted', $payload['event']);
        $this->assertSame('h4j_attempt_demo_loaves_0001', $payload['donation_attempt_id']);
        $this->assertSame('evt_h4j_demo_20260527_0001', $payload['checkout_event_id']);
        $this->assertSame('txn_demo_loaves_1042', $payload['transaction_id']);
        $this->assertSame('completed', $payload['transaction_status']);
        $this->assertArrayNotHasKey('donor_email', $payload);
        $this->assertArrayNotHasKey('failure_message', $payload);
    }

    public function test_failed_payment_builds_payment_failed_payload(): void
    {
        $event = CheckoutEvent::create($this->checkoutAttributes([
            'event_id' => 'evt_h4j_demo_20260527_0002',
            'event_type' => 'payment.failed',
            'transaction_status' => 'failed',
            'transaction_id' => null,
            'donation_attempt_id' => 'h4j_attempt_demo_fish_0002',
            'campaign_id' => 'fish-campaign-02',
            'campaign_name' => 'Fish 4 Joy',
            'donation_label' => '3 fish',
            'failure_code' => 'card_declined',
        ]));

        $payload = app(ServerAnalyticsEventBuilder::class)->fromCheckoutEvent($event);

        $this->assertSame('PaymentFailed', $payload['event']);
        $this->assertSame('failed', $payload['transaction_status']);
        $this->assertArrayNotHasKey('transaction_id', $payload);
    }

    public function test_pending_checkout_does_not_build_conversion_payload(): void
    {
        $event = CheckoutEvent::create($this->checkoutAttributes([
            'event_type' => 'donation.created',
            'transaction_status' => 'pending',
        ]));

        $this->assertNull(app(ServerAnalyticsEventBuilder::class)->fromCheckoutEvent($event));
    }

    public function test_successful_crm_sync_builds_hubspot_sync_succeeded_payload(): void
    {
        $event = CheckoutEvent::create($this->checkoutAttributes([]));
        $attempt = CrmSyncAttempt::create([
            'checkout_event_id' => $event->id,
            'status' => 'succeeded',
        ]);

        $payload = app(ServerAnalyticsEventBuilder::class)->fromCrmSyncAttempt($event, $attempt);

        $this->assertSame('HubSpotSyncSucceeded', $payload['event']);
        $this->assertSame('succeeded', $payload['crm_sync_status']);
        $this->assertArrayNotHasKey('crm_error_code', $payload);
    }

    public function test_list_warning_builds_hubspot_sync_failed_payload(): void
    {
        $event = CheckoutEvent::create($this->checkoutAttributes([]));
        $attempt = CrmSyncAttempt::create([
            'checkout_event_id' => $event->id,
            'status' => 'succeeded',
            'error_code' => 'hubspot_list_warning',
        ]);

        $payload = app(ServerAnalyticsEventBuilder::class)->fromCrmSyncAttempt($event, $attempt);

        $this->assertSame('HubSpotSyncFailed', $payload['event']);
        $this->assertSame('hubspot_list_warning', $payload['crm_error_code']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function checkoutAttributes(array $overrides = []): array
    {
        return array_merge([
            'event_id' => 'evt_h4j_demo_20260527_0001',
            'event_type' => 'donation.created',
            'event_created_at' => '2026-05-27T14:05:00Z',
            'donation_attempt_id' => 'h4j_attempt_demo_loaves_0001',
            'checkout_provider' => 'foxy',
            'checkout_session_id' => 'sess_demo_loaves_0001',
            'transaction_id' => 'txn_demo_loaves_1042',
            'transaction_status' => 'completed',
            'idempotency_key' => 'evt_h4j_demo_20260527_0001',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 25,
            'donation_currency' => 'USD',
            'donation_label' => '3 loaves',
            'donation_type' => 'one_time',
            'donor_email' => 'jordan.helper@example.test',
            'donor_first_name' => 'Jordan',
            'donor_last_name' => 'Helper',
        ], $overrides);
    }
}
