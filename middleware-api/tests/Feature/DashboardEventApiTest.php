<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $this->assertSame('donation_completed_crm_synced', $response['data'][0]['status_summary']);
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
            ->assertJsonPath('data.status_summary', 'payment_failed')
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
            ->assertJsonPath('data.checkout_session_id', 'sess_demo_loaves_0001');
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
            ->assertJsonPath('data.0.status_summary', 'donation_completed_crm_retryable')
            ->assertJsonPath('data.0.crm_sync.status', 'retryable');
    }

    public function test_dashboard_pending_checkout_event_uses_checkout_pending_summary(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('checkout-pending.one-time.json'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/events?search=riley.pending@example.test')
            ->assertOk()
            ->assertJsonPath('data.0.status_summary', 'checkout_pending')
            ->assertJsonPath('data.0.transaction_status', 'pending')
            ->assertJsonPath('data.0.crm_sync.status', 'not_applicable')
            ->assertJsonPath('data.0.crm_sync.eligible', false);
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
