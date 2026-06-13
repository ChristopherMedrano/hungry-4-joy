<?php

namespace Tests\Feature;

use App\Models\CheckoutEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardStatusDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_status_demo_seeder_creates_every_badge_state(): void
    {
        $this->artisan('dashboard:seed-status-demo')
            ->assertExitCode(0)
            ->expectsOutputToContain('Dashboard status demo rows are ready at /api/dashboard/events');

        $this->assertSame(8, CheckoutEvent::query()->count());

        $this->getJson('/api/dashboard/events?per_page=50')
            ->assertOk()
            ->assertJsonCount(8, 'data');

        $crmSummaries = collect($this->getJson('/api/dashboard/events?per_page=50')->json('data'))
            ->pluck('crm_status_summary')
            ->unique()
            ->sort()
            ->values()
            ->all();

        $transactionStatuses = collect($this->getJson('/api/dashboard/events?per_page=50')->json('data'))
            ->pluck('transaction_status')
            ->unique()
            ->sort()
            ->values()
            ->all();

        $this->assertSame(
            ['failed', 'not_applicable', 'pending', 'retryable', 'synced', 'warning'],
            $crmSummaries,
        );

        $this->assertSame(
            ['completed', 'failed', 'pending'],
            $transactionStatuses,
        );
    }

    public function test_dashboard_status_demo_seeder_can_be_repeated_without_duplicate_rows(): void
    {
        $this->artisan('dashboard:seed-status-demo')->assertExitCode(0);
        $this->artisan('dashboard:seed-status-demo')->assertExitCode(0);

        $this->assertSame(8, CheckoutEvent::query()->count());
    }
}
