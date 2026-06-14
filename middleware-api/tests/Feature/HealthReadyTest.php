<?php

namespace Tests\Feature;

use App\Support\Health\MiddlewareHealthReporter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HealthReadyTest extends TestCase
{
    use RefreshDatabase;
    public function test_health_ready_returns_all_checks(): void
    {
        $response = $this->getJson('/api/health/ready');

        $response
            ->assertOk()
            ->assertJsonPath('service', 'hungry-4-joy-middleware-api')
            ->assertJsonStructure([
                'service',
                'status',
                'checked_at',
                'checks' => [
                    'api' => ['status', 'label', 'summary'],
                    'database' => ['status', 'label', 'summary'],
                    'migrations' => ['status', 'label', 'summary'],
                    'foxy_webhook' => ['status', 'label', 'summary'],
                    'foxy_api' => ['status', 'label', 'summary'],
                    'hubspot' => ['status', 'label', 'summary'],
                    'wordpress' => ['status', 'label', 'summary'],
                    'queue' => ['status', 'label', 'summary', 'driver', 'failed_jobs'],
                ],
            ]);

        $this->assertContains($response->json('status'), ['ok', 'degraded']);
        $this->assertSame('ok', $response->json('checks.database.status'));
        $this->assertSame('ok', $response->json('checks.migrations.status'));
    }

    public function test_health_ready_returns_degraded_when_foxy_not_configured(): void
    {
        config([
            'services.foxy.webhook_encryption_key' => null,
            'services.foxy.client_id' => null,
            'services.foxy.client_secret' => null,
            'services.foxy.refresh_token' => null,
            'services.foxy.store_id' => null,
            'services.hubspot.enabled' => false,
        ]);

        $response = $this->getJson('/api/health/ready');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'degraded')
            ->assertJsonPath('checks.foxy_webhook.status', 'not_configured')
            ->assertJsonPath('checks.foxy_api.status', 'not_configured')
            ->assertJsonPath('checks.hubspot.status', 'disabled');
    }

    public function test_health_ready_reports_configured_integrations(): void
    {
        config([
            'services.foxy.webhook_encryption_key' => 'demo-webhook-key',
            'services.foxy.client_id' => 'demo-client',
            'services.foxy.client_secret' => 'demo-secret',
            'services.foxy.refresh_token' => 'demo-refresh',
            'services.foxy.store_id' => '12345',
            'services.hubspot.enabled' => true,
            'services.hubspot.access_token' => 'demo-token',
        ]);

        $response = $this->getJson('/api/health/ready');

        $response
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('checks.foxy_webhook.status', 'configured')
            ->assertJsonPath('checks.foxy_api.status', 'configured')
            ->assertJsonPath('checks.hubspot.status', 'enabled');
    }

    public function test_health_ready_returns_service_unavailable_when_database_fails(): void
    {
        $checks = [
            'api' => ['status' => 'ok', 'label' => 'Middleware API', 'summary' => 'API process is responding.'],
            'database' => ['status' => 'failed', 'label' => 'Database', 'summary' => 'Database connection failed.'],
            'migrations' => ['status' => 'ok', 'label' => 'Migrations', 'summary' => 'Required tables are present.'],
            'foxy_webhook' => ['status' => 'not_configured', 'label' => 'Foxy webhook', 'summary' => 'Webhook encryption key is not set.'],
            'foxy_api' => ['status' => 'not_configured', 'label' => 'Foxy hAPI', 'summary' => 'OAuth credentials are not fully set.'],
            'hubspot' => ['status' => 'disabled', 'label' => 'HubSpot sync', 'summary' => 'HubSpot sync is disabled for this environment.'],
            'wordpress' => ['status' => 'disabled', 'label' => 'WordPress', 'summary' => 'WordPress site URL is not configured for readiness checks.'],
            'queue' => ['status' => 'ok', 'label' => 'Queue', 'summary' => 'Queue driver: sync.', 'driver' => 'sync', 'failed_jobs' => 0],
        ];

        $this->mock(MiddlewareHealthReporter::class, function ($mock) use ($checks): void {
            $mock->shouldReceive('report')->once()->andReturn([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'down',
                'checked_at' => now()->toIso8601String(),
                'checks' => $checks,
            ]);
            $mock->shouldReceive('httpStatusFor')->once()->with($checks)->andReturn(503);
        });

        $response = $this->getJson('/api/health/ready');

        $response
            ->assertStatus(503)
            ->assertJsonPath('status', 'down')
            ->assertJsonPath('checks.database.status', 'failed');
    }

    public function test_health_ready_reports_wordpress_ok_when_site_responds(): void
    {
        config(['services.wordpress.site_url' => 'https://campaign.example.test']);

        Http::fake([
            'https://campaign.example.test' => Http::response('ok', 200),
        ]);

        $response = $this->getJson('/api/health/ready');

        $response
            ->assertOk()
            ->assertJsonPath('checks.wordpress.status', 'ok');
    }

    public function test_health_ready_response_excludes_secrets(): void
    {
        config([
            'services.foxy.webhook_encryption_key' => 'super-secret-webhook-key',
            'services.foxy.client_secret' => 'super-secret-client',
            'services.hubspot.access_token' => 'super-secret-hubspot-token',
        ]);

        $response = $this->getJson('/api/health/ready');
        $body = $response->getContent();

        $this->assertIsString($body);
        $this->assertStringNotContainsString('super-secret-webhook-key', $body);
        $this->assertStringNotContainsString('super-secret-client', $body);
        $this->assertStringNotContainsString('super-secret-hubspot-token', $body);
    }
}
