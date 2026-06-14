<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardHandoffApiTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function handoffPayload(string $attemptId): array
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

    public function test_dashboard_handoffs_index_returns_only_unlinked_handoffs(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_unlinked_01'))
            ->assertAccepted();

        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_unlinked_02'))
            ->assertAccepted();

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();

        CheckoutHandoff::query()
            ->where('donation_attempt_id', 'h4j_attempt_unlinked_02')
            ->update([
                'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
                'checkout_event_id' => $event->id,
            ]);

        $this->getJson('/api/dashboard/handoffs')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.donation_attempt_id', 'h4j_attempt_unlinked_01')
            ->assertJsonPath('data.0.handoff.status', 'cart_handoff_created')
            ->assertJsonPath('data.0.handoff.reconciliation.checkout_event_id', null);
    }

    public function test_dashboard_handoffs_index_supports_search(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_search_target'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/handoffs?search=search_target')
            ->assertOk()
            ->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.donation_attempt_id', 'h4j_attempt_search_target');

        $this->getJson('/api/dashboard/handoffs?search=missing_value')
            ->assertOk()
            ->assertJsonPath('meta.total', 0);
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
