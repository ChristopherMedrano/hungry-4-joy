<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardHandoffBatchTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);
    }

    public function test_dashboard_reconcile_open_processes_all_non_terminal_handoffs(): void
    {
        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/transactions')) {
                return Http::response([
                    '_embedded' => [
                        'fx:transactions' => [],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_batch_open_01',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now()->addHour(),
            'reconcile_attempts' => 0,
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 10,
            'donation_currency' => 'USD',
            'donation_label' => '1 loaf',
            'donation_type' => 'one_time',
        ]);

        CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_batch_open_02',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now()->addHour(),
            'reconcile_attempts' => 0,
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 10,
            'donation_currency' => 'USD',
            'donation_label' => '1 loaf',
            'donation_type' => 'one_time',
        ]);

        $this->postJson('/api/dashboard/handoffs/reconcile-open')
            ->assertAccepted()
            ->assertJsonPath('data.processed', 2)
            ->assertJsonPath('data.still_open', 2)
            ->assertJsonPath('data.linked', 0);
    }

    public function test_dashboard_sweep_unfed_ingests_transaction_with_attempt_id(): void
    {
        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), 'data_is_fed=false')) {
                return Http::response([
                    '_embedded' => [
                        'fx:transactions' => [
                            $this->unfedFoxyTransaction(),
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/dashboard/handoffs/sweep-unfed', ['hours' => 24])
            ->assertAccepted()
            ->assertJsonPath('data.scanned', 1)
            ->assertJsonPath('data.ingested', 1)
            ->assertJsonPath('data.linked', 0)
            ->assertJsonPath('data.skipped_existing', 0)
            ->assertJsonPath('data.skipped_no_attempt_id', 0);

        $this->assertDatabaseHas('checkout_events', [
            'donation_attempt_id' => 'h4j_attempt_sweep_unfed_01',
            'event_type' => 'payment.failed',
            'transaction_status' => 'failed',
        ]);

        $this->assertDatabaseHas('checkout_handoffs', [
            'donation_attempt_id' => 'h4j_attempt_sweep_unfed_01',
            'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
            'foxy_transaction_id' => '2246566861',
        ]);
    }

    public function test_dashboard_sweep_unfed_links_existing_event_to_handoff(): void
    {
        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), 'data_is_fed=false')) {
                return Http::response([
                    '_embedded' => [
                        'fx:transactions' => [
                            $this->unfedFoxyTransaction('h4j_attempt_sweep_existing_01'),
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $event = CheckoutEvent::create([
            'event_id' => 'evt_sweep_existing_01',
            'event_type' => 'payment.failed',
            'event_created_at' => '2026-06-13T12:00:00Z',
            'donation_attempt_id' => 'h4j_attempt_sweep_existing_01',
            'checkout_provider' => 'foxy',
            'checkout_session_id' => 'foxy-cart-decline',
            'transaction_id' => '2246566861',
            'transaction_status' => 'failed',
            'idempotency_key' => 'foxy_transaction_2246566861_sweep_unfed',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 10,
            'donation_currency' => 'USD',
            'donation_label' => '1 loaf',
            'donation_type' => 'one_time',
            'donor_email' => 'john@test.com',
            'donor_first_name' => 'John',
            'donor_last_name' => 'Donor',
            'failure_code' => 'checkout_incomplete',
        ]);

        CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_sweep_existing_01',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now(),
            'reconcile_attempts' => 1,
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 10,
            'donation_currency' => 'USD',
            'donation_label' => '1 loaf',
            'donation_type' => 'one_time',
        ]);

        $this->postJson('/api/dashboard/handoffs/sweep-unfed')
            ->assertAccepted()
            ->assertJsonPath('data.scanned', 1)
            ->assertJsonPath('data.ingested', 0)
            ->assertJsonPath('data.linked', 1)
            ->assertJsonPath('data.skipped_existing', 0);

        $this->assertDatabaseHas('checkout_handoffs', [
            'donation_attempt_id' => 'h4j_attempt_sweep_existing_01',
            'checkout_event_id' => $event->id,
            'handoff_status' => CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED,
        ]);
    }

    public function test_dashboard_sweep_unfed_returns_error_when_foxy_not_configured(): void
    {
        config([
            'services.foxy.client_id' => null,
            'services.foxy.client_secret' => null,
            'services.foxy.refresh_token' => null,
            'services.foxy.store_id' => null,
        ]);

        $this->postJson('/api/dashboard/handoffs/sweep-unfed')
            ->assertAccepted()
            ->assertJsonPath('data.scanned', 0)
            ->assertJsonPath('data.errors', ['foxy_api_not_configured']);
    }

    /**
     * @return array<string, mixed>
     */
    private function unfedFoxyTransaction(string $attemptId = 'h4j_attempt_sweep_unfed_01'): array
    {
        return [
            'id' => 2246566861,
            'date_created' => '2026-06-13T12:00:00-0400',
            'customer_email' => 'john@test.com',
            'customer_first_name' => 'John',
            'customer_last_name' => 'Donor',
            'total_order' => 10,
            'currency_code' => 'USD',
            'status' => '',
            'data_is_fed' => false,
            'cart' => 'foxy-cart-decline',
            '_embedded' => [
                'fx:items' => [
                    [
                        'name' => 'Loaves 4 Joy',
                        'code' => 'loaves-campaign-01',
                        'price' => 10,
                        'options' => [
                            ['name' => 'donation_attempt_id', 'value' => $attemptId],
                            ['name' => 'donation_label', 'value' => '1 loaf'],
                            ['name' => 'donation_type', 'value' => 'one_time'],
                            ['name' => 'source_page', 'value' => 'home'],
                            ['name' => 'campaign_name', 'value' => 'Loaves 4 Joy'],
                        ],
                    ],
                ],
            ],
        ];
    }
}
