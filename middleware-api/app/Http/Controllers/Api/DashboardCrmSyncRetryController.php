<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\SyncDonationToHubSpot;
use App\Models\CrmSyncAttempt;
use App\Models\IntegrationStepLog;
use App\Services\Integration\IntegrationStepLogger;
use App\Support\Dashboard\DashboardEventPresenter;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class DashboardCrmSyncRetryController extends Controller
{
    public function __construct(
        private readonly DashboardEventPresenter $presenter,
        private readonly IntegrationStepLogger $stepLogger,
    ) {}

    public function store(int $crmSyncAttemptId): JsonResponse
    {
        $attempt = CrmSyncAttempt::query()
            ->with('checkoutEvent.crmSyncAttempt')
            ->findOrFail($crmSyncAttemptId);

        $event = $attempt->checkoutEvent;

        if ($attempt->status === 'pending') {
            return response()->json([
                'message' => 'CRM sync is already in progress for this attempt.',
            ], Response::HTTP_CONFLICT);
        }

        if (! $event->hubSpotSyncEligible() || ! $attempt->manualRetryEligible()) {
            return response()->json([
                'message' => 'This CRM sync attempt is not eligible for manual retry.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        SyncDonationToHubSpot::dispatch($event->id);

        $this->stepLogger->record(
            IntegrationStepLog::STEP_CRM_SYNC_DISPATCHED,
            IntegrationStepLog::STATUS_SUCCEEDED,
            IntegrationStepLog::PRODUCER_LARAVEL_QUEUE,
            'HubSpot sync job dispatched from dashboard retry.',
            $event->donation_attempt_id,
            checkoutEventId: $event->id,
            crmSyncAttemptId: $attempt->id,
        );

        $event->refresh()->load(['crmSyncAttempt', 'serverAnalyticsEvents.checkoutEvent']);

        return response()->json([
            'data' => $this->presenter->detail($event),
        ]);
    }
}
