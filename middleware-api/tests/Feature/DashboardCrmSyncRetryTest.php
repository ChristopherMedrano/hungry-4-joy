<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardCrmSyncRetryTest extends TestCase
{
    use RefreshDatabase;

    public function test_retryable_attempt_can_be_retried_and_returns_updated_detail(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        $attempt = CrmSyncAttempt::where('checkout_event_id', $event->id)->firstOrFail();
        $attempt->update([
            'status' => 'retryable',
            'error_code' => 'hubspot_retryable_error',
            'error_message' => 'HubSpot deal creation failed with status 503.',
            'retry_count' => 1,
            'next_retry_at' => now()->addMinutes(15),
        ]);

        $this->postJson("/api/dashboard/crm-sync/{$attempt->id}/retry")
            ->assertOk()
            ->assertJsonPath('data.crm_status_summary', 'synced')
            ->assertJsonPath('data.crm_sync.status', 'succeeded')
            ->assertJsonPath('data.checkout_event_id', $event->id);
    }

    public function test_terminal_failed_attempt_can_be_retried(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $attempt = CrmSyncAttempt::firstOrFail();
        $attempt->update([
            'status' => 'failed',
            'error_code' => 'hubspot_terminal_error',
            'error_message' => 'HubSpot contact upsert failed with status 400.',
        ]);

        $this->postJson("/api/dashboard/crm-sync/{$attempt->id}/retry")
            ->assertOk()
            ->assertJsonPath('data.crm_sync.status', 'succeeded');
    }

    public function test_synced_attempt_returns_422(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $attempt = CrmSyncAttempt::firstOrFail();

        $this->postJson("/api/dashboard/crm-sync/{$attempt->id}/retry")
            ->assertUnprocessable()
            ->assertJsonPath('message', 'This CRM sync attempt is not eligible for manual retry.');
    }

    public function test_pending_attempt_returns_409(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $attempt = CrmSyncAttempt::firstOrFail();
        $attempt->update(['status' => 'pending']);

        $this->postJson("/api/dashboard/crm-sync/{$attempt->id}/retry")
            ->assertConflict()
            ->assertJsonPath('message', 'CRM sync is already in progress for this attempt.');
    }

    public function test_list_warning_attempt_retry_increments_retry_count(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();
        $attempt = CrmSyncAttempt::where('checkout_event_id', $event->id)->firstOrFail();
        $attempt->update([
            'status' => 'succeeded',
            'hubspot_contact_id' => '498781781750',
            'hubspot_deal_id' => '329059097290',
            'error_code' => 'hubspot_list_warning',
            'error_message' => 'HubSpot list enrollment failed with status 403.',
            'retry_count' => 0,
        ]);

        $this->postJson("/api/dashboard/crm-sync/{$attempt->id}/retry")
            ->assertOk()
            ->assertJsonPath('data.crm_status_summary', 'synced')
            ->assertJsonPath('data.crm_sync.retry_count', 1)
            ->assertJsonPath('data.crm_sync.error_code', null);
    }

    public function test_unknown_attempt_returns_404(): void
    {
        $this->postJson('/api/dashboard/crm-sync/99999/retry')->assertNotFound();
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
