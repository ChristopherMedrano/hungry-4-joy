<?php

namespace Tests\Feature;

use App\Models\CheckoutHandoff;
use App\Models\IntegrationStepLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class OperatorAccessControlTest extends TestCase
{
    use RefreshDatabase;

    public function test_documented_default_rate_limits_match_runtime_configuration(): void
    {
        $this->assertSame(60, config('access_control.operator_auth_failures_per_minute'));
        $this->assertSame(120, config('access_control.operator_reads_per_minute'));
        $this->assertSame(10, config('access_control.operator_mutations_per_minute'));
        $this->assertSame(300, config('access_control.public_handoffs_per_minute'));
        $this->assertSame(600, config('access_control.foxy_webhooks_per_minute'));
    }

    public function test_protected_route_families_reject_missing_and_invalid_credentials_generically(): void
    {
        foreach ([
            ['GET', '/api/dashboard/events'],
            ['POST', '/api/checkout/handoffs/reconcile'],
            ['GET', '/api/health/ready'],
        ] as [$method, $uri]) {
            $missing = $this->withoutHeader('Authorization')->json($method, $uri);
            $missing->assertUnauthorized()
                ->assertHeader('WWW-Authenticate', 'Bearer')
                ->assertExactJson(['message' => 'Authentication required.']);

            $candidate = 'invalid-candidate-that-must-not-leak';
            $invalid = $this->withToken($candidate)->json($method, $uri);
            $invalid->assertUnauthorized()
                ->assertHeader('WWW-Authenticate', 'Bearer')
                ->assertExactJson(['message' => 'Authentication required.']);

            $this->assertStringNotContainsString($candidate, $invalid->getContent());
        }
    }

    public function test_valid_credentials_preserve_each_protected_route_family(): void
    {
        $this->getJson('/api/dashboard/events')->assertOk();
        $this->getJson('/api/health/ready')->assertStatus(200);
        $this->postJson('/api/checkout/handoffs/reconcile', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('donation_attempt_id');
    }

    public function test_missing_server_configuration_fails_closed_with_the_same_response(): void
    {
        config(['services.dashboard.operator_token' => null]);

        $response = $this->withToken('presented-but-server-is-unconfigured')
            ->getJson('/api/dashboard/events');

        $response->assertUnauthorized()
            ->assertHeader('WWW-Authenticate', 'Bearer')
            ->assertExactJson(['message' => 'Authentication required.']);
        $this->assertStringNotContainsString('unconfigured', $response->getContent());
    }

    public function test_authorization_header_parser_rejects_noncanonical_bearer_formats(): void
    {
        foreach ([
            'bearer test-dashboard-operator-token',
            'Bearer  test-dashboard-operator-token',
            'Bearer test-dashboard-operator-token trailing',
            'Basic test-dashboard-operator-token',
        ] as $authorization) {
            $this->withHeader('Authorization', $authorization)
                ->getJson('/api/dashboard/events')
                ->assertUnauthorized()
                ->assertExactJson(['message' => 'Authentication required.']);
        }
    }

    public function test_every_dashboard_route_inherits_authentication_and_rate_limits(): void
    {
        $dashboardRoutes = collect(Route::getRoutes()->getRoutes())
            ->filter(fn ($route) => str_starts_with($route->uri(), 'api/dashboard/'));

        $this->assertNotEmpty($dashboardRoutes);

        foreach ($dashboardRoutes as $route) {
            $middleware = $route->gatherMiddleware();

            $this->assertContains('operator.auth', $middleware, $route->uri());
            $this->assertContains('throttle:operator-api', $middleware, $route->uri());
        }
    }

    public function test_intentionally_public_routes_do_not_require_operator_credentials(): void
    {
        config(['services.foxy.webhook_encryption_key' => 'public-boundary-test-webhook-key']);
        $this->withoutHeader('Authorization');

        $this->getJson('/api/health')->assertOk();
        $this->postJson('/api/checkout/handoffs', $this->validHandoffPayload(1))
            ->assertAccepted();
        $this->postJson('/api/foxy/webhooks', [])
            ->assertUnauthorized()
            ->assertJsonPath('status', 'signature_invalid');
    }

    public function test_public_handoff_rate_limit_stops_database_writes_after_threshold(): void
    {
        config(['access_control.public_handoffs_per_minute' => 30]);
        $this->withoutHeader('Authorization');

        for ($index = 1; $index <= 30; $index++) {
            $this->postJson('/api/checkout/handoffs', $this->validHandoffPayload($index))
                ->assertAccepted();
        }

        $this->postJson('/api/checkout/handoffs', $this->validHandoffPayload(31))
            ->assertTooManyRequests();

        $this->assertSame(30, CheckoutHandoff::count());
        $this->assertDatabaseMissing('checkout_handoffs', [
            'donation_attempt_id' => 'h4j_attempt_rate_limit_31',
        ]);
    }

    public function test_forwarded_address_headers_cannot_split_the_global_public_bucket(): void
    {
        config(['access_control.public_handoffs_per_minute' => 2]);
        $this->withoutHeader('Authorization');

        $this->withHeader('X-Forwarded-For', '198.51.100.10')
            ->postJson('/api/checkout/handoffs', $this->validHandoffPayload(41))
            ->assertAccepted();
        $this->withHeader('X-Forwarded-For', '203.0.113.20')
            ->postJson('/api/checkout/handoffs', $this->validHandoffPayload(42))
            ->assertAccepted();
        $this->withHeader('X-Forwarded-For', '192.0.2.30')
            ->postJson('/api/checkout/handoffs', $this->validHandoffPayload(43))
            ->assertTooManyRequests();

        $this->assertSame(2, CheckoutHandoff::count());
    }

    public function test_operator_mutation_rate_limit_stops_reconciliation_side_effects(): void
    {
        config([
            'services.foxy.client_id' => null,
            'services.foxy.client_secret' => null,
            'services.foxy.refresh_token' => null,
            'services.foxy.store_id' => null,
        ]);

        $attemptId = 'h4j_attempt_operator_mutation_limit';
        $this->postJson('/api/checkout/handoffs', $this->validHandoffPayload(99))
            ->assertAccepted();

        CheckoutHandoff::query()
            ->where('donation_attempt_id', 'h4j_attempt_rate_limit_99')
            ->update(['donation_attempt_id' => $attemptId]);

        for ($index = 1; $index <= 10; $index++) {
            $this->postJson('/api/checkout/handoffs/reconcile', [
                'donation_attempt_id' => $attemptId,
            ])->assertAccepted();
        }

        $attemptsBeforeThrottle = CheckoutHandoff::query()
            ->where('donation_attempt_id', $attemptId)
            ->value('reconcile_attempts');

        $this->postJson('/api/checkout/handoffs/reconcile', [
            'donation_attempt_id' => $attemptId,
        ])->assertTooManyRequests();

        $this->assertSame(
            $attemptsBeforeThrottle,
            CheckoutHandoff::query()
                ->where('donation_attempt_id', $attemptId)
                ->value('reconcile_attempts'),
        );
    }

    public function test_failed_operator_attempts_are_rate_limited_before_authentication(): void
    {
        for ($index = 1; $index <= 60; $index++) {
            $this->withToken("invalid-operator-token-{$index}")
                ->getJson('/api/dashboard/events')
                ->assertUnauthorized();
        }

        $this->withToken('one-more-invalid-operator-token')
            ->getJson('/api/dashboard/events')
            ->assertTooManyRequests();

        $this->withToken('test-dashboard-operator-token')
            ->getJson('/api/dashboard/events')
            ->assertOk();
    }

    public function test_valid_operator_requests_do_not_consume_the_failure_bucket(): void
    {
        for ($index = 1; $index <= 60; $index++) {
            $this->withToken('test-dashboard-operator-token')
                ->getJson('/api/dashboard/events')
                ->assertOk();
        }

        $this->withToken('invalid-after-valid-traffic')
            ->getJson('/api/dashboard/events')
            ->assertUnauthorized();
    }

    public function test_webhook_rate_limit_stops_rejection_logging_after_threshold(): void
    {
        config(['access_control.foxy_webhooks_per_minute' => 120]);
        config(['services.foxy.webhook_encryption_key' => 'rate-limit-test-webhook-key']);
        $this->withoutHeader('Authorization');

        for ($index = 1; $index <= 120; $index++) {
            $this->withHeader('Foxy-Webhook-Signature', "invalid-signature-{$index}")
                ->postJson('/api/foxy/webhooks', [])
                ->assertUnauthorized()
                ->assertJsonPath('status', 'signature_invalid');
        }

        $rejectionsBeforeThrottle = IntegrationStepLog::query()
            ->where('step', IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED)
            ->count();

        $this->withHeader('Foxy-Webhook-Signature', 'one-more-invalid-signature')
            ->postJson('/api/foxy/webhooks', [])
            ->assertTooManyRequests();

        $this->assertSame(
            $rejectionsBeforeThrottle,
            IntegrationStepLog::query()
                ->where('step', IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED)
                ->count(),
        );
    }

    /**
     * @return array<string, mixed>
     */
    private function validHandoffPayload(int $index): array
    {
        return [
            'donation_attempt_id' => "h4j_attempt_rate_limit_{$index}",
            'handoff_at' => now()->toIso8601String(),
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
}
