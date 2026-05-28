<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CheckoutEventFixtureReceiverTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param array<string, mixed> $payload
     */
    #[DataProvider('checkoutEventFixtures')]
    public function test_checkout_event_fixtures_are_accepted_and_stored(string $fileName, array $payload): void
    {
        // Each fixture should remain a working receiver example, not just static documentation.
        $this->postJson('/api/checkout/events', $payload)->assertAccepted();

        $this->assertDatabaseHas('checkout_events', [
            'event_id' => $payload['event_id'],
            'event_type' => $payload['event_type'],
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
            'donor_phone' => $payload['donor']['phone'] ?? null,
            'failure_code' => $payload['failure']['failure_code'] ?? null,
            'failure_message' => $payload['failure']['failure_message'] ?? null,
            'failure_provider_status' => $payload['failure']['provider_status'] ?? null,
        ]);
    }

    /**
     * @param array<string, mixed> $payload
     */
    #[DataProvider('checkoutEventFixtures')]
    public function test_checkout_event_fixture_retries_are_ignored(string $fileName, array $payload): void
    {
        // Fixture retries should prove both receiver storage and idempotency behavior.
        $this->postJson('/api/checkout/events', $payload)->assertAccepted();

        $this->postJson('/api/checkout/events', $payload)
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'duplicate_ignored',
            ]);

        $this->assertSame(
            1,
            DB::table('checkout_events')->where('event_id', $payload['event_id'])->count(),
            $fileName.' should only create one checkout event row.'
        );
    }

    /**
     * @return array<string, array{string, array<string, mixed>}>
     */
    public static function checkoutEventFixtures(): array
    {
        $fixtureDirectory = dirname(__DIR__, 3).'/examples/checkout-events';
        $fixtures = [];

        foreach (glob($fixtureDirectory.'/*.json') as $path) {
            $fileName = basename($path);
            $fixtures[$fileName] = [
                $fileName,
                json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR),
            ];
        }

        return $fixtures;
    }
}
