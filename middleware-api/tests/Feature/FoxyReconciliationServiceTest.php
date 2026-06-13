<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use App\Services\Foxy\FoxyReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FoxyReconciliationServiceTest extends TestCase
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

    public function test_reconciler_ingests_payment_failed_from_foxy_api_response(): void
    {
        Http::fake([
            'api.foxycart.com/token' => Http::response(['access_token' => 'test-access-token'], 200),
            'api.foxycart.com/stores/120139/transactions*' => Http::response([
                '_embedded' => [
                    'fx:transactions' => [
                        $this->declinedFoxyTransaction(),
                    ],
                ],
            ], 200),
        ]);

        $handoff = CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_reconcile_decline_01',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now(),
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

        app(FoxyReconciliationService::class)->reconcile($handoff);

        $handoff->refresh();

        $this->assertSame(CheckoutHandoff::STATUS_CHECKOUT_EVENT_RECONCILED, $handoff->handoff_status);
        $this->assertNotNull($handoff->checkout_event_id);
        $this->assertSame('2246566861', $handoff->foxy_transaction_id);

        $event = CheckoutEvent::findOrFail($handoff->checkout_event_id);
        $this->assertSame('payment.failed', $event->event_type);
        $this->assertSame('failed', $event->transaction_status);
        $this->assertSame('checkout_incomplete', $event->failure_code);
    }

    public function test_handoff_with_no_foxy_match_schedules_retry(): void
    {
        Http::fake([
            'api.foxycart.com/token' => Http::response(['access_token' => 'test-access-token'], 200),
            'api.foxycart.com/stores/120139/transactions*' => Http::response([
                '_embedded' => [
                    'fx:transactions' => [],
                ],
            ], 200),
        ]);

        $handoff = CheckoutHandoff::create([
            'donation_attempt_id' => 'h4j_attempt_reconcile_missing_01',
            'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
            'handoff_at' => now(),
            'next_reconcile_at' => now(),
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

        app(FoxyReconciliationService::class)->reconcile($handoff);

        $handoff->refresh();

        $this->assertSame(CheckoutHandoff::STATUS_CART_HANDOFF_CREATED, $handoff->handoff_status);
        $this->assertNull($handoff->checkout_event_id);
        $this->assertSame(1, $handoff->reconcile_attempts);
        $this->assertNotNull($handoff->next_reconcile_at);
        $this->assertSame('foxy_transaction_not_found', $handoff->reconciliation_note);
    }

    /**
     * @return array<string, mixed>
     */
    private function declinedFoxyTransaction(): array
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
                            ['name' => 'donation_attempt_id', 'value' => 'h4j_attempt_reconcile_decline_01'],
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
