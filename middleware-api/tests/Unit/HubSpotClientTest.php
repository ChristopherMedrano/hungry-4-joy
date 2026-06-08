<?php

namespace Tests\Unit;

use App\Contracts\HubSpotClient;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HttpHubSpotClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HubSpotClientTest extends TestCase
{
    protected function tearDown(): void
    {
        Http::preventStrayRequests(false);

        parent::tearDown();
    }

    public function test_hubspot_config_defaults_to_disabled_with_newsletter_list_id(): void
    {
        $this->assertFalse(config('services.hubspot.enabled'));
        $this->assertNull(config('services.hubspot.access_token'));
        $this->assertSame('9', config('services.hubspot.newsletter_list_id'));
    }
}
