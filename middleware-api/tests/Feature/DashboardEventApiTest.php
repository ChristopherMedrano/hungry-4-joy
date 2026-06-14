<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DashboardEventApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_events_index_returns_empty_envelope_when_no_rows_exist(): void
    {
        $this->getJson('/api/dashboard/events')
            ->assertOk()
            ->assertExactJson([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'per_page' => 25,
                    'total' => 0,
                    'last_page' => 1,
                ],
                'filters' => [
                    'campaign_id' => null,
                    'event_type' => null,
                    'transaction_status' => null,
                    'crm_sync_status' => null,
                    'checkout_provider' => null,
                    'source_page' => null,
                    'ingest_channel' => null,
                    'event_created_from' => null,
                    'event_created_to' => null,
                    'search' => null,
                    'sort' => '-event_created_at',
                    'retry_activity' => null,
                ],
            ]);
    }

    public function test_dashboard_events_index_returns_fixture_shaped_summaries(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $response = $this->getJson('/api/dashboard/events')
            ->assertOk()
            ->json();

        $this->assertCount(1, $response['data']);
        $this->assertSame('synced', $response['data'][0]['crm_status_summary']);
        $this->assertSame('completed', $response['data'][0]['transaction_status']);
        $this->assertSame('fixture_receiver', $response['data'][0]['ingest']['channel']);
        $this->assertSame('jordan.helper@example.test', $response['data'][0]['donor']['email']);
        $this->assertSame('succeeded', $response['data'][0]['crm_sync']['status']);
        $this->assertArrayNotHasKey('failure_message', $response['data'][0]);
        $this->assertArrayNotHasKey('hubspot_contact_id', $response['data'][0]['crm_sync']);
    }

    public function test_dashboard_event_detail_exposes_redacted_failure_fields_only(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::where('event_type', 'payment.failed')->firstOrFail();

        $this->getJson('/api/dashboard/events/'.$event->id)
            ->assertOk()
            ->assertJsonPath('data.transaction_status', 'failed')
            ->assertJsonPath('data.crm_status_summary', 'not_applicable')
            ->assertJsonPath('data.failure.failure_code', 'card_declined')
            ->assertJsonPath('data.failure.failure_message', 'Payment was declined by the test gateway.')
            ->assertJsonPath('data.crm_sync.status', 'not_applicable')
            ->assertJsonPath('data.crm_sync.hubspot_contact_id', null)
            ->assertJsonPath('data.crm_sync.hubspot_mode', 'fake');
    }

    public function test_dashboard_events_can_filter_by_campaign_and_crm_sync_status(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();
        $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/events?campaign_id=loaves-campaign-01&crm_sync_status=succeeded')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.campaign.campaign_id', 'loaves-campaign-01');

        $this->getJson('/api/dashboard/events?crm_sync_status=not_applicable')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.event_type', 'payment.failed');
    }

    public function test_dashboard_event_lookup_by_donation_attempt_id(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/events/by-attempt/h4j_attempt_demo_loaves_0001')
            ->assertOk()
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_demo_loaves_0001')
            ->assertJsonPath('data.checkout_event.checkout_session_id', 'sess_demo_loaves_0001')
            ->assertJsonPath('data.handoff', null);
    }

    public function test_dashboard_event_lookup_by_attempt_returns_handoff_only_when_no_checkout_event(): void
    {
        $this->postJson('/api/checkout/handoffs', [
            'donation_attempt_id' => 'h4j_attempt_dashboard_handoff_only',
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 25,
            'donation_label' => '3 loaves',
            'donation_type' => 'one_time',
        ])->assertAccepted();

        $this->getJson('/api/dashboard/events/by-attempt/h4j_attempt_dashboard_handoff_only')
            ->assertOk()
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_dashboard_handoff_only')
            ->assertJsonPath('data.handoff.status', 'cart_handoff_created')
            ->assertJsonPath('data.checkout_event', null);
    }

    public function test_dashboard_event_lookup_by_attempt_returns_404_when_neither_exists(): void
    {
        $this->getJson('/api/dashboard/events/by-attempt/h4j_attempt_missing_both')
            ->assertNotFound();
    }

    public function test_dashboard_event_lookup_by_foxy_cart_id_resolves_attempt_and_handoff(): void
    {
        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);

        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/carts/2247125087')) {
                return Http::response([
                    'total_order' => 0,
                    'total_item_price' => 0,
                    'customer_email' => 'toast@example.com',
                    'date_created' => '2026-06-13T17:09:46-0700',
                    'date_modified' => '2026-06-13T17:10:42-0700',
                    '_embedded' => [
                        'fx:items' => [
                            [
                                'name' => 'Fish 4 Joy',
                                'price' => 25,
                                'quantity' => 1,
                                '_embedded' => [
                                    'fx:item_options' => [
                                        [
                                            'name' => 'donation_attempt_id',
                                            'value' => 'h4j_attempt_foxy_cart_lookup_01',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->postJson('/api/checkout/handoffs', [
            'donation_attempt_id' => 'h4j_attempt_foxy_cart_lookup_01',
            'checkout_provider' => 'foxy',
            'source_page' => 'home',
            'campaign_id' => 'fish-campaign-01',
            'campaign_name' => 'Fish 4 Joy',
            'donation_amount' => 25,
            'donation_label' => '3 fish',
            'donation_type' => 'one_time',
        ])->assertAccepted();

        $this->getJson('/api/dashboard/events/by-cart/2247125087')
            ->assertOk()
            ->assertJsonPath('data.foxy_cart_id', '2247125087')
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_foxy_cart_lookup_01')
            ->assertJsonPath('data.donation_attempt_ids', ['h4j_attempt_foxy_cart_lookup_01'])
            ->assertJsonPath('data.foxy_cart.items.0.name', 'Fish 4 Joy')
            ->assertJsonPath('data.foxy_cart.items.0.donation_attempt_id', 'h4j_attempt_foxy_cart_lookup_01')
            ->assertJsonPath('data.handoff.status', 'cart_handoff_created')
            ->assertJsonPath('data.checkout_event', null);
    }

    public function test_dashboard_event_lookup_by_foxy_cart_id_returns_foxy_data_without_middleware_rows(): void
    {
        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);

        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/carts/2247125087')) {
                return Http::response([
                    'total_order' => 0,
                    'total_item_price' => 0,
                    '_embedded' => [
                        'fx:items' => [
                            [
                                'name' => 'Fish 4 Joy',
                                'price' => 25,
                                'quantity' => 1,
                                '_embedded' => [
                                    'fx:item_options' => [
                                        [
                                            'name' => 'donation_attempt_id',
                                            'value' => 'h4j_attempt_foxy_cart_only',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $this->getJson('/api/dashboard/events/by-cart/2247125087')
            ->assertOk()
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_foxy_cart_only')
            ->assertJsonPath('data.handoff', null)
            ->assertJsonPath('data.checkout_event', null);
    }

    public function test_dashboard_event_lookup_by_foxy_cart_id_returns_404_when_cart_missing(): void
    {
        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);

        Http::fake(function (\Illuminate\Http\Client\Request $request) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/carts/999')) {
                return Http::response([], 404);
            }

            return Http::response([], 404);
        });

        $this->getJson('/api/dashboard/events/by-cart/999')
            ->assertNotFound();
    }

    public function test_dashboard_retryable_crm_state_is_reflected_in_summary(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'retryable',
            'error_code' => 'hubspot_retryable_error',
            'error_message' => 'HubSpot deal creation failed with status 503.',
            'retry_count' => 1,
            'next_retry_at' => now()->addMinutes(15),
        ]);

        $this->getJson('/api/dashboard/events')
            ->assertOk()
            ->assertJsonPath('data.0.crm_status_summary', 'retryable')
            ->assertJsonPath('data.0.crm_sync.status', 'retryable');
    }

    public function test_dashboard_pending_checkout_event_uses_checkout_pending_summary(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('checkout-pending.one-time.json'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/events?search=riley.pending@example.test')
            ->assertOk()
            ->assertJsonPath('data.0.transaction_status', 'pending')
            ->assertJsonPath('data.0.crm_status_summary', 'not_applicable')
            ->assertJsonPath('data.0.transaction_status', 'pending')
            ->assertJsonPath('data.0.crm_sync.status', 'not_applicable')
            ->assertJsonPath('data.0.crm_sync.eligible', false);
    }

    public function test_dashboard_list_warning_summary_for_list_enrollment_failure(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'succeeded',
            'error_code' => 'hubspot_list_warning',
            'error_message' => 'Newsletter list enrollment failed with status 403.',
        ]);

        $this->getJson('/api/dashboard/events')
            ->assertOk()
            ->assertJsonPath('data.0.crm_status_summary', 'warning')
            ->assertJsonPath('data.0.crm_sync.status', 'succeeded')
            ->assertJsonPath('data.0.crm_sync.error_code', 'hubspot_list_warning');
    }

    public function test_dashboard_detail_exposes_terminal_crm_failure_fields(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'failed',
            'error_code' => 'hubspot_terminal_error',
            'error_message' => 'HubSpot contact upsert failed with status 400.',
            'last_attempted_at' => now(),
        ]);

        $this->getJson('/api/dashboard/events/'.$event->id)
            ->assertOk()
            ->assertJsonPath('data.crm_status_summary', 'failed')
            ->assertJsonPath('data.crm_sync.status', 'failed')
            ->assertJsonPath('data.crm_sync.error_code', 'hubspot_terminal_error')
            ->assertJsonPath('data.crm_sync.error_message', 'HubSpot contact upsert failed with status 400.')
            ->assertJsonPath('data.crm_sync.last_attempted_at', fn ($value) => filled($value));
    }

    public function test_dashboard_detail_exposes_hubspot_ids_on_success(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        $attempt = CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->firstOrFail();

        $this->getJson('/api/dashboard/events/'.$event->id)
            ->assertOk()
            ->assertJsonPath('data.crm_status_summary', 'synced')
            ->assertJsonPath('data.crm_sync.status', 'succeeded')
            ->assertJsonPath('data.crm_sync.hubspot_mode', 'fake')
            ->assertJsonPath('data.crm_sync.crm_sync_attempt_id', $attempt->id)
            ->assertJsonPath('data.crm_sync.hubspot_contact_id', $attempt->hubspot_contact_id)
            ->assertJsonPath('data.crm_sync.hubspot_deal_id', $attempt->hubspot_deal_id)
            ->assertJsonPath('data.crm_sync.hubspot_donation_attempt_id', 'h4j_attempt_demo_loaves_0001')
            ->assertJsonPath('data.crm_sync.last_attempted_at', fn ($value) => filled($value));
    }

    public function test_dashboard_retry_activity_filter_returns_failed_retryable_and_list_warning_rows(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'retryable',
            'error_code' => 'hubspot_retryable_error',
            'retry_count' => 1,
        ]);

        $this->getJson('/api/dashboard/events?retry_activity=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.donation_attempt_id', 'h4j_attempt_demo_loaves_0001')
            ->assertJsonPath('filters.retry_activity', '1');

        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'succeeded',
            'error_code' => 'hubspot_list_warning',
            'error_message' => 'HubSpot list enrollment failed with status 403.',
            'retry_count' => 0,
        ]);

        $this->getJson('/api/dashboard/events?retry_activity=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.crm_status_summary', 'warning');

        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'succeeded',
            'error_code' => null,
            'error_message' => null,
            'retry_count' => 1,
        ]);

        $this->getJson('/api/dashboard/events?retry_activity=1')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.crm_sync.retry_count', 1);
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
