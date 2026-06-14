<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntegrationStepLog;
use App\Support\Dashboard\DashboardIntegrationStepPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardIntegrationStepController extends Controller
{
    public function __construct(private readonly DashboardIntegrationStepPresenter $presenter) {}

    public function index(Request $request): JsonResponse
    {
        $donationAttemptId = $request->string('donation_attempt_id')->toString() ?: null;
        $perPage = min(max((int) $request->integer('per_page', 50), 1), 100);

        if ($donationAttemptId === null || $donationAttemptId === '') {
            return response()->json([
                'message' => 'donation_attempt_id is required.',
            ], 422);
        }

        $paginator = IntegrationStepLog::query()
            ->where('donation_attempt_id', $donationAttemptId)
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn (IntegrationStepLog $log) => $this->presenter->summary($log))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => [
                'donation_attempt_id' => $donationAttemptId,
            ],
        ]);
    }
}
