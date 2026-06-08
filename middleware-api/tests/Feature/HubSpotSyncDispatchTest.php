<?php

namespace Tests\Feature;

use App\Contracts\HubSpotClient;
use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use App\Services\HubSpot\FakeHubSpotClient;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use RuntimeException;
use Tests\TestCase;

class HubSpotSyncDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_receiver_dispatches_hubspot_sync_for_new_completed_donation(): void
    {
        Bus::fake();

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();

        Bus::assertDispatched(SyncDonationToHubSpot::class, function (SyncDonationToHubSpot $job) use ($event): bool {
            return $job->checkoutEventId === $event->id;
        });
    }

    public function test_duplicate_checkout_replay_does_not_dispatch_second_hubspot_sync(): void
    {
        Bus::fake();
        $payload = $this->fixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();
        $this->postJson('/api/checkout/events', $payload)->assertOk();

        Bus::assertDispatchedTimes(SyncDonationToHubSpot::class, 1);
    }

    public function test_failed_payment_does_not_dispatch_hubspot_sync(): void
    {
        Bus::fake();

        $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'))
            ->assertAccepted();

        Bus::assertNotDispatched(SyncDonationToHubSpot::class);
    }

    public function test_sync_queue_hubspot_failure_is_recorded_without_rejecting_checkout_event(): void
    {
        $this->app->instance(HubSpotClient::class, new FailingDispatchHubSpotClient);

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        $attempt = $event->crmSyncAttempt()->firstOrFail();

        $this->assertSame('retryable', $attempt->status);
        $this->assertSame('hubspot_retryable_error', $attempt->error_code);
        $this->assertSame('HubSpot deal creation failed with status 503.', $attempt->error_message);
        $this->assertSame(1, $attempt->retry_count);
        $this->assertNotNull($attempt->last_attempted_at);
        $this->assertNotNull($attempt->next_retry_at);
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

class FailingDispatchHubSpotClient extends FakeHubSpotClient
{
    public function __construct()
    {
        parent::__construct(enabled: true);
    }

    public function createDeal(array $properties): string
    {
        throw new RuntimeException('HubSpot deal creation failed with status 503.');
    }
}
