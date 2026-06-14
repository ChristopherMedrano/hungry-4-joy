<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Health\MiddlewareHealthReporter;
use Illuminate\Http\JsonResponse;

class HealthReadyController extends Controller
{
    public function __invoke(MiddlewareHealthReporter $reporter): JsonResponse
    {
        $report = $reporter->report();

        return response()->json($report, $reporter->httpStatusFor($report['checks']));
    }
}
