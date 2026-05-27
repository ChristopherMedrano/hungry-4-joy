<?php

namespace Tests\Feature;

use Tests\TestCase;

class CheckoutEventReceiverRouteTest extends TestCase
{
    public function test_checkout_event_receiver_route_accepts_json_without_processing_it(): void
    {
        $response = $this->postJson('/api/checkout/events', [
            'event_id' => 'evt_h4j_demo_20260527_0001',
            'event_type' => 'donation.created',
            'checkout_provider' => 'foxy',
        ]);

        $response
            ->assertAccepted()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'accepted',
            ]);
    }
}
