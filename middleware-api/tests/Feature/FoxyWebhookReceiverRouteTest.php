<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FoxyWebhookReceiverRouteTest extends TestCase
{
    use RefreshDatabase;

    private const WEBHOOK_SECRET = 'demo-foxy-webhook-secret';

    public function test_foxy_webhook_receiver_accepts_signed_transaction_created_payload(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();

        $response = $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'transaction/created')
        );

        $response
            ->assertAccepted()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'accepted',
            ]);

        $this->assertDatabaseHas('checkout_events', [
            'event_id' => 'foxy_transaction_1042_transaction_created',
            'event_type' => 'donation.created',
            'checkout_provider' => 'foxy',
            'checkout_session_id' => 'foxy-cart-abc123',
            'transaction_id' => '1042',
            'transaction_status' => 'completed',
            'donation_attempt_id' => 'h4j_attempt_foxy_cart_1042',
            'idempotency_key' => 'foxy_transaction_1042_transaction_created',
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

    public function test_foxy_webhook_receiver_falls_back_to_transaction_based_attempt_id(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();
        $payload['_embedded']['fx:items'][0]['options'] = array_values(array_filter(
            $payload['_embedded']['fx:items'][0]['options'],
            fn (array $option): bool => $option['name'] !== 'donation_attempt_id'
        ));

        $response = $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'transaction/created')
        );

        $response->assertAccepted();

        $this->assertDatabaseHas('checkout_events', [
            'event_id' => 'foxy_transaction_1042_transaction_created',
            'donation_attempt_id' => 'h4j_attempt_foxy_transaction_1042',
        ]);
    }

    public function test_foxy_webhook_receiver_rejects_malformed_donation_attempt_id_option(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();
        foreach ($payload['_embedded']['fx:items'][0]['options'] as &$option) {
            if ($option['name'] === 'donation_attempt_id') {
                $option['value'] = 'jordan.helper@example.test';
            }
        }
        unset($option);

        $response = $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'transaction/created')
        );

        $response->assertUnprocessable();
        $this->assertDatabaseCount('checkout_events', 0);
    }

    public function test_foxy_webhook_receiver_rejects_invalid_signature(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();

        $response = $this->postJson('/api/foxy/webhooks', $payload, [
            'Foxy-Webhook-Event' => 'transaction/created',
            'Foxy-Webhook-Signature' => 'not-a-valid-signature',
        ]);

        $response
            ->assertUnauthorized()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'signature_invalid',
            ]);

        $this->assertDatabaseCount('checkout_events', 0);
    }

    public function test_foxy_webhook_receiver_rejects_unsupported_event(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();

        $response = $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'customer/created')
        );

        $response
            ->assertUnprocessable()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'unsupported_foxy_event',
            ]);

        $this->assertDatabaseCount('checkout_events', 0);
    }

    public function test_foxy_webhook_receiver_ignores_duplicate_signed_retries(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();
        $headers = $this->signedHeaders($payload, 'transaction/created');

        $this->postJson('/api/foxy/webhooks', $payload, $headers)->assertAccepted();

        $this->postJson('/api/foxy/webhooks', $payload, $headers)
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'duplicate_ignored',
            ]);

        $this->assertSame(1, DB::table('checkout_events')->where('event_id', 'foxy_transaction_1042_transaction_created')->count());
    }

    public function test_foxy_webhook_receiver_treats_signed_refeed_as_duplicate_transaction_replay(): void
    {
        config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

        $payload = $this->foxyTransactionPayload();

        $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'transaction/created')
        )->assertAccepted();

        $this->postJson(
            '/api/foxy/webhooks',
            $payload,
            $this->signedHeaders($payload, 'transaction/refeed')
        )
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'duplicate_ignored',
            ]);

        $this->assertSame(1, DB::table('checkout_events')->where('transaction_id', '1042')->count());
    }

    /**
     * @return array<string, mixed>
     */
    private function foxyTransactionPayload(): array
    {
        return [
            'id' => 1042,
            'date_created' => '2026-05-28T14:20:00-0400',
            'customer_email' => 'jordan.helper@example.test',
            'customer_first_name' => 'Jordan',
            'customer_last_name' => 'Helper',
            'customer_phone' => '555-0104',
            'total_order' => 25,
            'currency_code' => 'USD',
            'status' => 'completed',
            'cart' => 'foxy-cart-abc123',
            '_embedded' => [
                'fx:items' => [
                    [
                        'name' => 'Loaves 4 Joy',
                        'code' => 'loaves-campaign-01',
                        'price' => 25,
                        'quantity' => 1,
                        'options' => [
                            ['name' => 'donation_label', 'value' => '3 loaves'],
                            ['name' => 'donation_type', 'value' => 'one_time'],
                            ['name' => 'source_page', 'value' => 'home'],
                            ['name' => 'donation_attempt_id', 'value' => 'h4j_attempt_foxy_cart_1042'],
                            ['name' => 'campaign_name', 'value' => 'Loaves 4 Joy'],
                            ['name' => 'checkout_provider', 'value' => 'foxy'],
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, string>
     */
    private function signedHeaders(array $payload, string $event): array
    {
        $body = json_encode($payload, JSON_THROW_ON_ERROR);

        return [
            'Foxy-Webhook-Event' => $event,
            'Foxy-Webhook-Signature' => hash_hmac('sha256', $body, self::WEBHOOK_SECRET),
        ];
    }
}
