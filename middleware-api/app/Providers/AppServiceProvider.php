<?php

namespace App\Providers;

use App\Contracts\HubSpotClient;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HttpHubSpotClient;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(HubSpotClient::class, function () {
            $enabled = (bool) config('services.hubspot.enabled');
            $accessToken = config('services.hubspot.access_token');

            if (! $enabled || ! filled($accessToken)) {
                return new FakeHubSpotClient;
            }

            return new HttpHubSpotClient($accessToken);
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('public-handoffs', fn () => [
            Limit::perMinute((int) config('access_control.public_handoffs_per_minute', 300))
                ->by('public-handoffs'),
        ]);

        RateLimiter::for('foxy-webhooks', fn () => [
            Limit::perMinute((int) config('access_control.foxy_webhooks_per_minute', 600))
                ->by('foxy-webhooks'),
        ]);

        RateLimiter::for('operator-api', fn () => [
            Limit::perMinute((int) config('access_control.operator_reads_per_minute', 120))
                ->by('dashboard-operator'),
        ]);

        RateLimiter::for('operator-mutations', fn () => [
            Limit::perMinute((int) config('access_control.operator_mutations_per_minute', 10))
                ->by('dashboard-operator'),
        ]);
    }
}
