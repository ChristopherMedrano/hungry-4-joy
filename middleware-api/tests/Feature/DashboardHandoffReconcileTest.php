<?php

namespace Tests\Feature;

use App\Models\CheckoutHandoff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardHandoffReconcileTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array<string, mixed>
     */
    private function handoffPayload(string $attemptId = 'h4j_attempt_dashboard_reconcile_01'): array
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

    public function test_dashboard_handoff_reconcile_increments_attempts_for_open_handoff(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload())
            ->assertAccepted();

        $this->postJson('/api/dashboard/handoffs/reconcile', [
            'donation_attempt_id' => 'h4j_attempt_dashboard_reconcile_01',
        ])
            ->assertAccepted()
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_dashboard_reconcile_01')
            ->assertJsonPath('data.handoff.status', 'cart_handoff_created')
            ->assertJsonPath('data.handoff.reconciliation.reconcile_attempts', 2)
            ->assertJsonPath('data.checkout_event', null);
    }

    public function test_dashboard_handoff_reconcile_returns_422_for_terminal_handoff(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_dashboard_reconcile_terminal'))
            ->assertAccepted();

        CheckoutHandoff::query()
            ->where('donation_attempt_id', 'h4j_attempt_dashboard_reconcile_terminal')
            ->update([
                'handoff_status' => CheckoutHandoff::STATUS_ABANDONED,
                'reconciliation_note' => 'no_foxy_transaction_within_window',
            ]);

        $this->postJson('/api/dashboard/handoffs/reconcile', [
            'donation_attempt_id' => 'h4j_attempt_dashboard_reconcile_terminal',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This handoff is not eligible for manual reconciliation.');
    }

    public function test_dashboard_handoff_reconcile_returns_404_for_unknown_attempt(): void
    {
        $this->postJson('/api/dashboard/handoffs/reconcile', [
            'donation_attempt_id' => 'h4j_attempt_missing_handoff',
        ])->assertNotFound();
    }

    public function test_dashboard_event_detail_includes_handoff_for_same_attempt_id(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_demo_loaves_0001'))
            ->assertAccepted();

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $eventId = \App\Models\CheckoutEvent::firstOrFail()->id;

        $this->getJson("/api/dashboard/events/{$eventId}")
            ->assertOk()
            ->assertJsonPath('data.handoff.status', 'cart_handoff_created')
            ->assertJsonPath('data.handoff.reconciliation.checkout_event_id', null)
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_demo_loaves_0001');
    }

    public function test_dashboard_handoff_reconcile_links_existing_checkout_event(): void
    {
        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/transactions')) {
                return Http::response([
                    '_embedded' => [
                        'fx:transactions' => [[
                            'id' => 2246566861,
                            'date_created' => '2026-06-13T12:00:00-0400',
                            'customer_email' => 'john@test.com',
                            'customer_first_name' => 'John',
                            'customer_last_name' => 'Donor',
                            'total_order' => 25,
                            'currency_code' => 'USD',
                            'status' => '',
                            'data_is_fed' => false,
                            'cart' => 'foxy-cart-decline',
                            '_embedded' => [
                                'fx:items' => [[
                                    'name' => 'Loaves 4 Joy',
                                    'code' => 'loaves-campaign-01',
                                    'price' => 25,
                                    'options' => [[
                                        'name' => 'donation_attempt_id',
                                        'value' => 'h4j_attempt_dashboard_reconcile_link',
                                    ], [
                                        'name' => 'donation_label',
                                        'value' => '3 loaves',
                                    ], [
                                        'name' => 'donation_type',
                                        'value' => 'one_time',
                                    ], [
                                        'name' => 'source_page',
                                        'value' => 'home',
                                    ], [
                                        'name' => 'campaign_name',
                                        'value' => 'Loaves 4 Joy',
                                    ]],
                                ]],
                            ],
                        ]],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);

        CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_dashboard_reconcile_link',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now(),
            'reconcile_attempts' => 0,
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 25,
            'donation_currency' => 'USD',
            'donation_label' => '3 loaves',
            'donation_type' => 'one_time',
        ]);

        $this->postJson('/api/dashboard/handoffs/reconcile', [
            'donation_attempt_id' => 'h4j_attempt_dashboard_reconcile_link',
        ])
            ->assertAccepted()
            ->assertJsonPath('data.handoff.status', 'checkout_event_reconciled')
            ->assertJsonPath('data.checkout_event.event_type', 'payment.failed');
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
