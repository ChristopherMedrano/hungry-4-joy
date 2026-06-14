<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutHandoff;
use App\Services\Foxy\FoxyReconciliationService;
use App\Support\Dashboard\DashboardEventPresenter;
use App\Support\Dashboard\DashboardHandoffPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class DashboardHandoffReconcileController extends Controller
{
    public function __construct(
        private readonly FoxyReconciliationService $reconciler,
        private readonly DashboardHandoffPresenter $handoffPresenter,
        private readonly DashboardEventPresenter $eventPresenter,
    ) {}

    public function store(Request $request): JsonResponse
    {
        if (! config('checkout.handoff_registration_enabled', true)) {
            return response()->json([
                'message' => 'Checkout handoff registration is disabled.',
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
                'message' => 'No checkout handoff found for this donation attempt id.',
            ], Response::HTTP_NOT_FOUND);
        }

        if (! $handoff->manualReconcileEligible()) {
            return response()->json([
                'message' => 'This handoff is not eligible for manual reconciliation.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $handoff = $this->reconciler->reconcile($handoff);

        return response()->json([
            'data' => $this->compositePayload($handoff),
        ], Response::HTTP_ACCEPTED);
    }

    /**
     * @return array<string, mixed>
     */
    private function compositePayload(CheckoutHandoff $handoff): array
    {
        $handoff->refresh();
        $event = $handoff->checkoutEvent()
            ->with(['crmSyncAttempt', 'serverAnalyticsEvents.checkoutEvent'])
            ->first();

        return [
            'donation_attempt_id' => $handoff->donation_attempt_id,
            'handoff' => $this->handoffPresenter->summary($handoff),
            'checkout_event' => $event ? $this->eventPresenter->detail($event) : null,
        ];
    }
}
