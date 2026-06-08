<?php

namespace Tests\Feature;

use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
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
