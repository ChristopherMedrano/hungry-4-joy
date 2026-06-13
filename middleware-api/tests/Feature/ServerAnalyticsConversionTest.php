<?php

namespace Tests\Feature;

use App\Contracts\HubSpotClient;
use App\Models\CheckoutEvent;
use App\Models\ServerAnalyticsEvent;
use App\Services\HubSpot\FakeHubSpotClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ServerAnalyticsConversionTest extends TestCase
{
    use RefreshDatabase;

    public function test_completed_checkout_fixture_emits_donation_completed_record(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();

        $this->assertDatabaseHas('server_analytics_events', [
            'event' => 'DonationCompleted',
            'checkout_event_id' => $event->id,
            'donation_attempt_id' => 'h4j_attempt_demo_loaves_0001',
        ]);

        $record = ServerAnalyticsEvent::firstOrFail();
        $this->assertSame('DonationCompleted', $record->payload['event']);
        $this->assertSame('server', $record->payload['producer']);
        $this->assertSame('h4j_attempt_demo_loaves_0001', $record->payload['donation_attempt_id']);
        $this->assertSame('txn_demo_loaves_1042', $record->payload['transaction_id']);
        $this->assertArrayNotHasKey('donor_email', $record->payload);
    }

    public function test_failed_payment_fixture_emits_payment_failed_record(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'))
            ->assertAccepted();

        $this->assertDatabaseHas('server_analytics_events', [
            'event' => 'PaymentFailed',
            'donation_attempt_id' => 'h4j_attempt_demo_fish_0002',
        ]);

        $this->assertDatabaseMissing('server_analytics_events', [
            'event' => 'DonationCompleted',
        ]);
    }

    public function test_pending_checkout_fixture_does_not_emit_conversion_record(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('checkout-pending.one-time.json'))
            ->assertAccepted();

        $this->assertDatabaseCount('server_analytics_events', 0);
    }

    public function test_duplicate_checkout_replay_does_not_create_duplicate_conversion_record(): void
    {
        $payload = $this->fixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();
        $this->postJson('/api/checkout/events', $payload)->assertOk();

        $this->assertSame(1, ServerAnalyticsEvent::query()->where('event', 'DonationCompleted')->count());
    }

    public function test_successful_hubspot_sync_emits_hubspot_sync_succeeded_record(): void
    {
        $this->app->instance(HubSpotClient::class, new FakeHubSpotClient(enabled: true));

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $this->assertDatabaseHas('server_analytics_events', [
            'event' => 'HubSpotSyncSucceeded',
        ]);

        $this->assertSame(2, ServerAnalyticsEvent::count());
    }

    public function test_hubspot_sync_failure_emits_hubspot_sync_failed_record(): void
    {
        $this->app->instance(HubSpotClient::class, new FailingHubSpotClient);

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $this->assertDatabaseHas('server_analytics_events', [
            'event' => 'HubSpotSyncFailed',
        ]);

        $record = ServerAnalyticsEvent::query()->where('event', 'HubSpotSyncFailed')->firstOrFail();
        $this->assertSame('retryable', $record->payload['crm_sync_status']);
        $this->assertSame('hubspot_retryable_error', $record->payload['crm_error_code']);
    }

    public function test_provider_writes_stay_disabled_by_default(): void
    {
        config(['analytics.providers_enabled' => false]);

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $this->assertDatabaseHas('server_analytics_events', [
            'event' => 'DonationCompleted',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function fixture(string $fileName): array
    {
        return json_decode(
            file_get_contents(base_path('../examples/checkout-events/'.$fileName)),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }
}

class FailingHubSpotClient extends FakeHubSpotClient
{
    public function __construct()
    {
        parent::__construct(enabled: true);
    }

    public function upsertContact(string $email, string $firstname, string $lastname, ?string $phone = null): string
    {
        throw new \RuntimeException('HubSpot request failed with status 503');
    }
}
