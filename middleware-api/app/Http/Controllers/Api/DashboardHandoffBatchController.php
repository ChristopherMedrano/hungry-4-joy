<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Foxy\FoxyReconciliationService;
use App\Services\Foxy\FoxyUnfedTransactionSweepService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardHandoffBatchController extends Controller
{
    public function __construct(
        private readonly FoxyReconciliationService $reconciler,
        private readonly FoxyUnfedTransactionSweepService $sweepService,
    ) {}

    public function reconcileOpen(Request $request): JsonResponse
    {
        if (! config('checkout.handoff_registration_enabled', true)) {
            return response()->json([
                'message' => 'Checkout handoff registration is disabled.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $validated = $request->validate([
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $summary = $this->reconciler->reconcileOpenHandoffs($validated['limit'] ?? null);

        return response()->json([
            'data' => $summary,
        ], Response::HTTP_ACCEPTED);
    }

    public function sweepUnfed(Request $request): JsonResponse
    {
        if (! config('checkout.handoff_registration_enabled', true)) {
            return response()->json([
                'message' => 'Checkout handoff registration is disabled.',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $validated = $request->validate([
            'hours' => ['nullable', 'integer', 'min:1', 'max:168'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $summary = $this->sweepService->sweep(
            $validated['hours'] ?? null,
            $validated['limit'] ?? null,
        );

        return response()->json([
            'data' => $summary,
        ], Response::HTTP_ACCEPTED);
    }
}
