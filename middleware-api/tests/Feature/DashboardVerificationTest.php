<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Acceptance checks for docs/dashboard-verification-walkthrough.md.
 */
class DashboardVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_duplicate_checkout_replay_does_not_add_dashboard_rows(): void
    {
        $payload = $this->checkoutFixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();
        $this->postJson('/api/checkout/events', $payload)
            ->assertOk()
            ->assertJsonPath('status', 'duplicate_ignored');

        $this->getJson('/api/dashboard/events')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_dashboard_list_and_detail_payloads_exclude_forbidden_payment_fields(): void
    {
        $this->artisan('dashboard:seed-status-demo')->assertExitCode(0);

        $list = $this->getJson('/api/dashboard/events?per_page=50')
            ->assertOk()
            ->json('data.0');

        $this->assertIsArray($list);
        $this->assertArrayNotHasKey('failure_message', $list);
        $this->assertArrayNotHasKey('hubspot_contact_id', $list['crm_sync']);

        $detail = $this->getJson('/api/dashboard/events/'.$list['checkout_event_id'])
            ->assertOk()
            ->json('data');

        $encoded = json_encode($detail, JSON_THROW_ON_ERROR);

        $this->assertStringNotContainsString('Bearer ', $encoded);
        $this->assertStringNotContainsString('pat-', $encoded);
        $this->assertStringNotContainsString('card_number', $encoded);
    }

    public function test_dashboard_verification_matrix_is_available_from_demo_seeder(): void
    {
        $this->artisan('dashboard:seed-status-demo')->assertExitCode(0);

        $rows = collect($this->getJson('/api/dashboard/events?per_page=50')->json('data'));

        $this->assertGreaterThanOrEqual(8, $rows->count());

        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'synced'
                && $row['transaction_status'] === 'completed',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'warning',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'pending',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'failed',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'retryable',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'not_applicable'
                && $row['transaction_status'] === 'pending',
        ));
        $this->assertTrue($rows->contains(
            fn (array $row): bool => $row['crm_status_summary'] === 'not_applicable'
                && $row['transaction_status'] === 'failed',
        ));

        $this->getJson('/api/dashboard/events?retry_activity=1')
            ->assertOk()
            ->assertJson(fn ($json) => $json->has('data')->etc());
    }

    /**
     * @return array<string, mixed>
     */
    private function checkoutFixture(string $fileName): array
    {
        return json_decode(
            file_get_contents(base_path('../examples/checkout-events/'.$fileName)),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }
}
