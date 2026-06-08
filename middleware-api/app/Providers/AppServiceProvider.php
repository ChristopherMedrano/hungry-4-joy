<?php

namespace App\Providers;

use App\Contracts\HubSpotClient;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HttpHubSpotClient;
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
        //
    }
}
