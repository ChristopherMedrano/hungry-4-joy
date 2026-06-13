<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Symfony\Component\HttpFoundation\Response;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('checkout:replay-fixtures {--path= : Directory containing checkout event fixture JSON files}', function () {
    $fixtureDirectory = $this->option('path') ?: base_path('../examples/checkout-events');
    $fixturePaths = glob(rtrim($fixtureDirectory, DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'*.json') ?: [];

    if ($fixturePaths === []) {
        $this->error('No checkout event fixture files found in '.$fixtureDirectory);

        return self::FAILURE;
    }

    sort($fixturePaths);

    foreach ($fixturePaths as $fixturePath) {
        $payload = file_get_contents($fixturePath);

        if ($payload === false) {
            $this->error(basename($fixturePath).': unreadable');

            return self::FAILURE;
        }

        $request = Request::create(
            '/api/checkout/events',
            'POST',
            server: [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_ACCEPT' => 'application/json',
            ],
            content: $payload,
        );

        $response = app()->handle($request);
        $decoded = json_decode($response->getContent(), true);
        $status = is_array($decoded) ? ($decoded['status'] ?? 'unknown') : 'unknown';

        $this->line(basename($fixturePath).': '.$status);

        if (! in_array($response->getStatusCode(), [Response::HTTP_ACCEPTED, Response::HTTP_OK], true)) {
            $this->error(basename($fixturePath).': receiver returned HTTP '.$response->getStatusCode());

            return self::FAILURE;
        }
    }

    return self::SUCCESS;
})->purpose('Replay tracked checkout event fixtures through the local receiver route');

Artisan::command('dashboard:seed-status-demo {--path= : Directory containing dashboard status demo fixture JSON files}', function () {
    $seeder = app(\App\Support\Dashboard\DashboardStatusDemoSeeder::class);

    try {
        foreach ($seeder->seed($this->option('path')) as $line) {
            $this->line($line);
        }
    } catch (\Throwable $exception) {
        $this->error($exception->getMessage());

        return self::FAILURE;
    }

    $this->info('Dashboard status demo rows are ready at /api/dashboard/events');

    return self::SUCCESS;
})->purpose('Seed checkout events that cover every dashboard transaction and CRM status badge');
