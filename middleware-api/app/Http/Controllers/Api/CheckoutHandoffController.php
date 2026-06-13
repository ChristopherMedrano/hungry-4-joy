<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutHandoff;
use App\Services\CheckoutHandoffRegistrar;
use App\Services\Foxy\FoxyReconciliationService;
use App\Support\Dashboard\DashboardHandoffPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CheckoutHandoffController extends Controller
{
    public function __construct(
        private readonly CheckoutHandoffRegistrar $registrar,
        private readonly FoxyReconciliationService $reconciler,
        private readonly DashboardHandoffPresenter $handoffPresenter,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $result = $this->registrar->register($request->all());

        $body = [
            'service' => 'hungry-4-joy-middleware-api',
            'status' => $result['status'],
        ];

        if ($result['handoff'] !== null) {
            $body['donation_attempt_id'] = $result['handoff']->donation_attempt_id;
        }

        return response()->json($body, $result['code']);
    }

    public function reconcile(Request $request): JsonResponse
    {
        if (! config('checkout.handoff_registration_enabled', true)) {
            return response()->json([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'handoff_registration_disabled',
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $validated = $request->validate([
            'donation_attempt_id' => ['required', 'string', 'max:128', 'regex:/^h4j_attempt_[A-Za-z0-9_-]+$/'],
        ]);

        $handoff = CheckoutHandoff::query()
            ->where('donation_attempt_id', $validated['donation_attempt_id'])
            ->first();

        if (! $handoff instanceof CheckoutHandoff) {
            return response()->json([
                'service' => 'hungry-4-joy-middleware-api',
                'status' => 'handoff_not_found',
            ], Response::HTTP_NOT_FOUND);
        }

        $handoff = $this->reconciler->reconcile($handoff);

        return response()->json([
            'service' => 'hungry-4-joy-middleware-api',
            'status' => 'reconcile_attempted',
            'donation_attempt_id' => $handoff->donation_attempt_id,
            'handoff' => $this->handoffPresenter->summary($handoff),
        ], Response::HTTP_ACCEPTED);
    }
}
