<?php

namespace App\Support\Health;

use App\Services\Foxy\FoxyApiClient;
use App\Services\FoxyWebhookVerifier;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Schema;

class MiddlewareHealthReporter
{
    private const REQUIRED_TABLES = [
        'checkout_events',
        'crm_sync_attempts',
        'checkout_handoffs',
        'integration_step_logs',
    ];

    public function __construct(
        private readonly FoxyWebhookVerifier $foxyWebhookVerifier,
        private readonly FoxyApiClient $foxyApiClient,
    ) {}

    /**
     * @return array{
     *     service: string,
     *     status: string,
     *     checked_at: string,
     *     checks: array<string, array<string, mixed>>
     * }
     */
    public function report(): array
    {
        $checks = [
            'api' => $this->apiCheck(),
            'database' => $this->databaseCheck(),
            'migrations' => $this->migrationsCheck(),
            'foxy_webhook' => $this->foxyWebhookCheck(),
            'foxy_api' => $this->foxyApiCheck(),
            'hubspot' => $this->hubspotCheck(),
            'wordpress' => $this->wordpressCheck(),
            'queue' => $this->queueCheck(),
        ];

        return [
            'service' => 'hungry-4-joy-middleware-api',
            'status' => $this->overallStatus($checks),
            'checked_at' => now()->toIso8601String(),
            'checks' => $checks,
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $checks
     */
    public function httpStatusFor(array $checks): int
    {
        return $checks['database']['status'] === 'failed' ? 503 : 200;
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function apiCheck(): array
    {
        return [
            'status' => 'ok',
            'label' => 'Middleware API',
            'summary' => 'API process is responding.',
        ];
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function databaseCheck(): array
    {
        try {
            DB::connection()->getPdo();

            return [
                'status' => 'ok',
                'label' => 'Database',
                'summary' => 'Database connection succeeded.',
            ];
        } catch (\Throwable) {
            return [
                'status' => 'failed',
                'label' => 'Database',
                'summary' => 'Database connection failed.',
            ];
        }
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function migrationsCheck(): array
    {
        $missing = array_values(array_filter(
            self::REQUIRED_TABLES,
            fn (string $table): bool => ! Schema::hasTable($table),
        ));

        if ($missing === []) {
            return [
                'status' => 'ok',
                'label' => 'Migrations',
                'summary' => 'Required tables are present.',
            ];
        }

        return [
            'status' => 'failed',
            'label' => 'Migrations',
            'summary' => 'Required tables are missing: '.implode(', ', $missing).'.',
        ];
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function foxyWebhookCheck(): array
    {
        if ($this->foxyWebhookVerifier->configured()) {
            return [
                'status' => 'configured',
                'label' => 'Foxy webhook',
                'summary' => 'Webhook encryption key is set.',
            ];
        }

        return [
            'status' => 'not_configured',
            'label' => 'Foxy webhook',
            'summary' => 'Webhook encryption key is not set.',
        ];
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function foxyApiCheck(): array
    {
        if ($this->foxyApiClient->configured()) {
            return [
                'status' => 'configured',
                'label' => 'Foxy hAPI',
                'summary' => 'OAuth credentials are set.',
            ];
        }

        return [
            'status' => 'not_configured',
            'label' => 'Foxy hAPI',
            'summary' => 'OAuth credentials are not fully set.',
        ];
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function hubspotCheck(): array
    {
        $enabled = (bool) config('services.hubspot.enabled');
        $tokenPresent = filled(config('services.hubspot.access_token'));

        if (! $enabled) {
            return [
                'status' => 'disabled',
                'label' => 'HubSpot sync',
                'summary' => 'HubSpot sync is disabled for this environment.',
            ];
        }

        if ($tokenPresent) {
            return [
                'status' => 'enabled',
                'label' => 'HubSpot sync',
                'summary' => 'HubSpot sync is enabled with an access token.',
            ];
        }

        return [
            'status' => 'not_configured',
            'label' => 'HubSpot sync',
            'summary' => 'HubSpot sync is enabled but no access token is set.',
        ];
    }

    /**
     * @return array{status: string, label: string, summary: string}
     */
    private function wordpressCheck(): array
    {
        $siteUrl = config('services.wordpress.site_url');

        if (! filled($siteUrl)) {
            return [
                'status' => 'disabled',
                'label' => 'WordPress',
                'summary' => 'WordPress site URL is not configured for readiness checks.',
            ];
        }

        try {
            $response = Http::timeout(5)
                ->withOptions(['allow_redirects' => true])
                ->get(rtrim((string) $siteUrl, '/'));

            if ($response->successful()) {
                return [
                    'status' => 'ok',
                    'label' => 'WordPress',
                    'summary' => 'WordPress site responded successfully.',
                ];
            }

            return [
                'status' => 'failed',
                'label' => 'WordPress',
                'summary' => 'WordPress site returned HTTP '.$response->status().'.',
            ];
        } catch (\Throwable) {
            return [
                'status' => 'failed',
                'label' => 'WordPress',
                'summary' => 'WordPress site is unreachable.',
            ];
        }
    }

    /**
     * @return array{status: string, label: string, summary: string, driver: string, failed_jobs: int}
     */
    private function queueCheck(): array
    {
        $driver = (string) config('queue.default', 'sync');
        $failedJobs = Schema::hasTable('failed_jobs')
            ? (int) DB::table('failed_jobs')->count()
            : 0;

        $summary = "Queue driver: {$driver}.";
        if ($failedJobs > 0) {
            $summary .= " {$failedJobs} failed job(s) recorded.";
        }

        return [
            'status' => 'ok',
            'label' => 'Queue',
            'summary' => $summary,
            'driver' => $driver,
            'failed_jobs' => $failedJobs,
        ];
    }

    /**
     * @param array<string, array<string, mixed>> $checks
     */
    private function overallStatus(array $checks): string
    {
        if ($checks['database']['status'] === 'failed') {
            return 'down';
        }

        if ($checks['migrations']['status'] === 'failed') {
            return 'degraded';
        }

        foreach (['foxy_webhook', 'foxy_api'] as $key) {
            if ($checks[$key]['status'] === 'not_configured') {
                return 'degraded';
            }
        }

        if ($checks['hubspot']['status'] === 'not_configured') {
            return 'degraded';
        }

        if ($checks['wordpress']['status'] === 'failed') {
            return 'degraded';
        }

        return 'ok';
    }
}
