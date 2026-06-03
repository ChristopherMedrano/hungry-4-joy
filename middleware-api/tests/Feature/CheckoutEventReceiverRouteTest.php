<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Services\CheckoutEventIngestor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class CheckoutEventReceiverRouteTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_event_receiver_route_accepts_valid_success_event_payload(): void
    {
        // A completed donation fixture should pass the current receiver contract.
        $response = $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'));

        $response
            ->assertAccepted()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'accepted',
            ]);
    }

    public function test_checkout_event_receiver_route_is_not_publicly_available_in_production(): void
    {
        app()->detectEnvironment(fn () => 'production');

        $response = $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'));

        $response->assertNotFound();
        $this->assertDatabaseCount('checkout_events', 0);
    }

    public function test_checkout_event_receiver_route_accepts_valid_failed_payment_payload(): void
    {
        // Failed payments are accepted when they include the safe failure details we expect.
        $response = $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'));

        $response
            ->assertAccepted()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'accepted',
            ]);
    }

    public function test_checkout_event_receiver_route_rejects_missing_required_payload_fields(): void
    {
        // Required top-level and nested fields should fail fast before later processing work.
        $payload = $this->fixture('donation-created.one-time.json');

        unset(
            $payload['event_id'],
            $payload['donation_attempt_id'],
            $payload['campaign']['campaign_id'],
            $payload['donation']['amount']
        );

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'event_id',
                'donation_attempt_id',
                'campaign.campaign_id',
                'donation.amount',
            ]);
    }

    public function test_checkout_event_receiver_route_rejects_malformed_donation_attempt_id(): void
    {
        $payload = $this->fixture('donation-created.one-time.json');
        $payload['donation_attempt_id'] = 'jordan.helper@example.test';

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['donation_attempt_id']);

        $this->assertDatabaseCount('checkout_events', 0);
    }

    public function test_checkout_event_receiver_route_rejects_unknown_event_types(): void
    {
        // Keep the receiver limited to the event types documented in the contract.
        $payload = $this->fixture('donation-created.one-time.json');
        $payload['event_type'] = 'not.supported';

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_type']);
    }

    public function test_checkout_event_receiver_route_rejects_failed_payment_without_failure_details(): void
    {
        // Failed payments without a redacted failure object are not useful enough to accept.
        $payload = $this->fixture('payment-failed.one-time.json');

        unset($payload['failure']);

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'failure',
                'failure.failure_code',
                'failure.failure_message',
                'failure.provider_status',
            ]);
    }

    public function test_checkout_event_receiver_route_rejects_sensitive_payment_or_secret_fields(): void
    {
        // The middleware should reject payloads that try to include payment details or secrets.
        $payload = $this->fixture('donation-created.one-time.json');

        // Field names are enough to prove the boundary; no real or test card values belong here.
        $payload['card_number'] = 'forbidden-demo-value';
        $payload['client_secret'] = 'forbidden-demo-value';

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'card_number',
                'client_secret',
            ]);
    }

    public function test_checkout_event_receiver_route_stores_safe_normalized_event_fields(): void
    {
        // Store the fields later workflows need without keeping raw provider payment data.
        $payload = $this->fixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();

        $this->assertDatabaseHas('checkout_events', [
            'event_id' => 'evt_h4j_demo_20260527_0001',
            'event_type' => 'donation.created',
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
            'donor_phone' => '555-0104',
        ]);
    }

    public function test_checkout_event_receiver_route_ignores_duplicate_event_ids(): void
    {
        // Webhook-style senders can retry; duplicates should not create extra rows.
        $payload = $this->fixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();

        $this->postJson('/api/checkout/events', $payload)
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'duplicate_ignored',
            ]);

        $this->assertSame(1, DB::table('checkout_events')->where('event_id', $payload['event_id'])->count());
    }

    public function test_checkout_event_receiver_route_ignores_duplicate_idempotency_keys(): void
    {
        // Some providers retry with a new event id but the same idempotency key.
        $payload = $this->fixture('donation-created.one-time.json');
        $duplicate = $payload;
        $duplicate['event_id'] = 'evt_h4j_demo_20260527_retry';

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();

        $this->postJson('/api/checkout/events', $duplicate)
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'duplicate_ignored',
            ]);

        $this->assertSame(1, DB::table('checkout_events')->where('idempotency_key', $payload['idempotency_key'])->count());
    }

    public function test_checkout_event_ingestor_treats_unique_constraint_collision_as_duplicate_retry(): void
    {
        $payload = $this->fixture('donation-created.one-time.json');

        CheckoutEvent::creating(function () use ($payload) {
            CheckoutEvent::withoutEvents(function () use ($payload) {
                CheckoutEvent::create([
                    'event_id' => $payload['event_id'],
                    'event_type' => $payload['event_type'],
                    'event_created_at' => Carbon::parse($payload['event_created_at']),
                    'donation_attempt_id' => $payload['donation_attempt_id'],
                    'checkout_provider' => $payload['checkout_provider'],
                    'checkout_session_id' => $payload['checkout_session_id'],
                    'transaction_id' => $payload['transaction_id'],
                    'transaction_status' => $payload['transaction_status'],
                    'idempotency_key' => $payload['idempotency_key'],
                    'source_page' => $payload['source_page'],
                    'campaign_id' => $payload['campaign']['campaign_id'],
                    'campaign_name' => $payload['campaign']['campaign_name'],
                    'donation_amount' => $payload['donation']['amount'],
                    'donation_currency' => $payload['donation']['currency'],
                    'donation_label' => $payload['donation']['donation_label'],
                    'donation_type' => $payload['donation']['donation_type'],
                    'donor_email' => $payload['donor']['email'],
                    'donor_first_name' => $payload['donor']['first_name'],
                    'donor_last_name' => $payload['donor']['last_name'],
                    'donor_phone' => $payload['donor']['phone'],
                ]);
            });
        });

        $result = app(CheckoutEventIngestor::class)->ingest($payload);

        $this->assertSame([
            'status' => 'duplicate_ignored',
            'code' => Response::HTTP_OK,
        ], $result);
        $this->assertDatabaseCount('checkout_events', 1);
    }

    /**
     * @return array<string, mixed>
     */
    private function fixture(string $fileName): array
    {
        // Reuse the contract fixtures so the receiver tests stay aligned with the docs.
        $path = base_path('../examples/checkout-events/'.$fileName);

        return json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }
}
