<?php

namespace Tests\Feature;

use App\Models\CheckoutHandoff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutHandoffRegistrationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function validPayload(string $attemptId = 'h4j_attempt_test_handoff_0001'): array
    {
        return [
            'donation_attempt_id' => $attemptId,
            'handoff_at' => '2026-06-13T12:00:00Z',
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 25,
            'donation_currency' => 'USD',
            'donation_label' => '3 loaves',
            'donation_type' => 'one_time',
        ];
    }

    public function test_valid_handoff_post_creates_row(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->validPayload())
            ->assertAccepted()
            ->assertJsonPath('status', 'handoff_registered')
            ->assertJsonPath('donation_attempt_id', 'h4j_attempt_test_handoff_0001');

        $this->assertDatabaseHas('checkout_handoffs', [
            'donation_attempt_id' => 'h4j_attempt_test_handoff_0001',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'campaign_id' => 'loaves-campaign-01',
        ]);
    }

    public function test_duplicate_attempt_id_is_idempotent(): void
    {
        $payload = $this->validPayload();

        $this->postJson('/api/checkout/handoffs', $payload)->assertAccepted();

        $this->postJson('/api/checkout/handoffs', $payload)
            ->assertOk()
            ->assertJsonPath('status', 'handoff_already_registered');

        $this->assertSame(1, CheckoutHandoff::count());
    }

    public function test_invalid_attempt_id_returns_422(): void
    {
        $payload = $this->validPayload('not-a-valid-attempt-id');

        $this->postJson('/api/checkout/handoffs', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['donation_attempt_id']);
    }

    public function test_missing_campaign_fields_return_422(): void
    {
        $payload = $this->validPayload();
        unset($payload['campaign_name']);

        $this->postJson('/api/checkout/handoffs', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['campaign_name']);
    }

    public function test_handoff_registration_can_be_disabled(): void
    {
        config(['checkout.handoff_registration_enabled' => false]);

        $this->postJson('/api/checkout/handoffs', $this->validPayload())
            ->assertStatus(503)
            ->assertJsonPath('status', 'handoff_registration_disabled');

        $this->assertSame(0, CheckoutHandoff::count());
    }
}
