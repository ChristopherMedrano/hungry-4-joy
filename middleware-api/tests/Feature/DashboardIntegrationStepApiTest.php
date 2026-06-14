<?php

namespace Tests\Feature;

use App\Models\IntegrationStepLog;
use App\Services\Integration\IntegrationStepLogger;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardIntegrationStepApiTest extends TestCase
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

    public function test_integration_events_index_requires_donation_attempt_id(): void
    {
        $this->getJson('/api/dashboard/integration-events')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'donation_attempt_id is required.');
    }

    public function test_handoff_registration_records_integration_steps(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_integration_steps'))
            ->assertAccepted();

        $this->assertDatabaseHas('integration_step_logs', [
            'donation_attempt_id' => 'h4j_attempt_integration_steps',
            'step' => IntegrationStepLog::STEP_HANDOFF_REGISTERED,
            'status' => IntegrationStepLog::STATUS_SUCCEEDED,
            'producer' => IntegrationStepLog::PRODUCER_LARAVEL_HANDOFF,
        ]);

        $this->assertDatabaseHas('integration_step_logs', [
            'donation_attempt_id' => 'h4j_attempt_integration_steps',
            'step' => IntegrationStepLog::STEP_HANDOFF_RECONCILE_ATTEMPTED,
            'producer' => IntegrationStepLog::PRODUCER_LARAVEL_RECONCILE,
        ]);
    }

    public function test_integration_events_index_returns_steps_for_attempt(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_integration_index'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/integration-events?donation_attempt_id=h4j_attempt_integration_index')
            ->assertOk()
            ->assertJsonPath('filters.donation_attempt_id', 'h4j_attempt_integration_index')
            ->assertJson(fn ($json) => $json
                ->has('data')
                ->where('meta.total', fn ($total) => $total >= 2)
                ->etc());
    }

    public function test_by_attempt_composite_includes_integration_steps(): void
    {
        $this->postJson('/api/checkout/handoffs', $this->handoffPayload('h4j_attempt_integration_trace'))
            ->assertAccepted();

        $this->getJson('/api/dashboard/events/by-attempt/h4j_attempt_integration_trace')
            ->assertOk()
            ->assertJsonPath('data.donation_attempt_id', 'h4j_attempt_integration_trace')
            ->assertJson(fn ($json) => $json
                ->has('data.integration_steps')
                ->where('data.integration_steps', fn ($steps) => count($steps) >= 2)
                ->etc());
    }

    public function test_integration_step_logger_dedupes_repeated_steps_within_window(): void
    {
        $logger = app(IntegrationStepLogger::class);

        $first = $logger->record(
            IntegrationStepLog::STEP_HANDOFF_RECONCILE_ATTEMPTED,
            IntegrationStepLog::STATUS_RETRYABLE,
            IntegrationStepLog::PRODUCER_LARAVEL_RECONCILE,
            'First reconcile note.',
            'h4j_attempt_dedupe_test',
            'foxy_transaction_not_found',
        );

        $second = $logger->record(
            IntegrationStepLog::STEP_HANDOFF_RECONCILE_ATTEMPTED,
            IntegrationStepLog::STATUS_RETRYABLE,
            IntegrationStepLog::PRODUCER_LARAVEL_RECONCILE,
            'Updated reconcile note.',
            'h4j_attempt_dedupe_test',
            'foxy_transaction_not_found',
        );

        $this->assertSame($first->id, $second->id);
        $this->assertSame(2, $second->occurrence_count);
        $this->assertDatabaseCount('integration_step_logs', 1);
    }
}
