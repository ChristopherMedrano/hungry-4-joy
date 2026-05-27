<?php

namespace Tests\Feature;

use Tests\TestCase;

class CheckoutEventReceiverRouteTest extends TestCase
{
    public function test_checkout_event_receiver_route_accepts_valid_success_event_payload(): void
    {
        $response = $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'));

        $response
            ->assertAccepted()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'accepted',
            ]);
    }

    public function test_checkout_event_receiver_route_accepts_valid_failed_payment_payload(): void
    {
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
        $payload = $this->fixture('donation-created.one-time.json');

        unset($payload['event_id'], $payload['campaign']['campaign_id'], $payload['donation']['amount']);

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'event_id',
                'campaign.campaign_id',
                'donation.amount',
            ]);
    }

    public function test_checkout_event_receiver_route_rejects_unknown_event_types(): void
    {
        $payload = $this->fixture('donation-created.one-time.json');
        $payload['event_type'] = 'not.supported';

        $response = $this->postJson('/api/checkout/events', $payload);

        $response
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['event_type']);
    }

    public function test_checkout_event_receiver_route_rejects_failed_payment_without_failure_details(): void
    {
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
        $payload = $this->fixture('donation-created.one-time.json');
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

    /**
     * @return array<string, mixed>
     */
    private function fixture(string $fileName): array
    {
        $path = base_path('../examples/checkout-events/'.$fileName);

        return json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
    }
}
