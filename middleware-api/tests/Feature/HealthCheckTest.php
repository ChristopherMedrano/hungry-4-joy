<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_api_health_endpoint_returns_project_status(): void
    {
        $response = $this->getJson('/api/health');

        $response
            ->assertOk()
            ->assertExactJson([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'ok',
            ]);
    }
}
