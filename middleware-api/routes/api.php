<?php

use App\Http\Controllers\Api\CheckoutHandoffController;
use App\Http\Controllers\Api\DashboardCrmSyncRetryController;
use App\Http\Controllers\Api\DashboardHandoffController;
use App\Http\Controllers\Api\DashboardHandoffReconcileController;
use App\Http\Controllers\Api\DashboardEventController;
use App\Http\Controllers\Api\DashboardIntegrationStepController;
use App\Http\Controllers\Api\DashboardServerAnalyticsController;
use App\Http\Controllers\Api\HealthReadyController;
use App\Models\CheckoutEvent;
use App\Models\IntegrationStepLog;
use App\Services\CheckoutHandoffLinker;
use App\Jobs\SyncDonationToHubSpot;
use App\Services\CheckoutEventIngestor;
use App\Services\FoxyWebhookAdapter;
use App\Services\FoxyWebhookVerifier;
use App\Services\Integration\IntegrationStepLogger;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    // Health endpoint is a simple JSON response.
    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'ok',
    ]);
});

Route::get('/health/ready', HealthReadyController::class);

$checkoutEventResponse = fn (string $status, int $code = Response::HTTP_OK) => response()->json([
    'service' => 'hungry-4-joy-middleware-api',
    'status' => $status,
], $code);

$dispatchHubSpotSync = function (array $result, IntegrationStepLogger $stepLogger): void {
    $checkoutEvent = $result['checkout_event'] ?? null;

    if ($checkoutEvent instanceof CheckoutEvent && $checkoutEvent->hubSpotSyncEligible()) {
        SyncDonationToHubSpot::dispatch($checkoutEvent->id);

        $stepLogger->record(
            IntegrationStepLog::STEP_CRM_SYNC_DISPATCHED,
            IntegrationStepLog::STATUS_SUCCEEDED,
            IntegrationStepLog::PRODUCER_LARAVEL_QUEUE,
            'HubSpot sync job dispatched.',
            $checkoutEvent->donation_attempt_id,
            checkoutEventId: $checkoutEvent->id,
        );
    }
};

$logCheckoutIngestResult = function (
    array $result,
    string $donationAttemptId,
    IntegrationStepLogger $stepLogger,
    string $producer = IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
): void {
    $checkoutEvent = $result['checkout_event'] ?? null;
    $checkoutEventId = $checkoutEvent instanceof CheckoutEvent ? $checkoutEvent->id : null;

    if (($result['status'] ?? '') === 'accepted') {
        $stepLogger->record(
            IntegrationStepLog::STEP_CHECKOUT_EVENT_INGESTED,
            IntegrationStepLog::STATUS_SUCCEEDED,
            $producer,
            'Checkout event ingested into middleware.',
            $donationAttemptId,
            checkoutEventId: $checkoutEventId,
        );

        return;
    }

    if (($result['status'] ?? '') === 'duplicate_ignored') {
        $stepLogger->record(
            IntegrationStepLog::STEP_CHECKOUT_EVENT_DUPLICATE,
            IntegrationStepLog::STATUS_SKIPPED,
            $producer,
            'Duplicate checkout event ignored.',
            $donationAttemptId,
            checkoutEventId: $checkoutEventId,
        );
    }
};

Route::post('/checkout/handoffs/reconcile', [CheckoutHandoffController::class, 'reconcile'])
    ->name('checkout.handoffs.reconcile');

Route::post('/checkout/handoffs', [CheckoutHandoffController::class, 'store'])
    ->name('checkout.handoffs.store');

Route::post('/checkout/events', function (
    Request $request,
    CheckoutEventIngestor $ingestor,
    IntegrationStepLogger $stepLogger
) use ($checkoutEventResponse, $dispatchHubSpotSync) {
    abort_if(app()->isProduction(), Response::HTTP_NOT_FOUND);

    $result = $ingestor->ingest($request->all());
    $dispatchHubSpotSync($result, $stepLogger);

    return $checkoutEventResponse($result['status'], $result['code']);
})->name('checkout.events.store');

Route::post('/foxy/webhooks', function (
    Request $request,
    FoxyWebhookVerifier $verifier,
    FoxyWebhookAdapter $adapter,
    CheckoutEventIngestor $ingestor,
    CheckoutHandoffLinker $handoffLinker,
    IntegrationStepLogger $stepLogger
) use ($checkoutEventResponse, $dispatchHubSpotSync, $logCheckoutIngestResult) {
    if (! $verifier->configured()) {
        $stepLogger->record(
            IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED,
            IntegrationStepLog::STATUS_FAILED,
            IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
            'Foxy webhook rejected: webhook not configured.',
            errorCode: 'webhook_not_configured',
        );

        return $checkoutEventResponse('webhook_not_configured', Response::HTTP_SERVICE_UNAVAILABLE);
    }

    $body = $request->getContent();

    if (! $verifier->valid($body, $request->header('Foxy-Webhook-Signature'))) {
        $stepLogger->record(
            IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED,
            IntegrationStepLog::STATUS_FAILED,
            IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
            'Foxy webhook rejected: invalid signature.',
            errorCode: 'signature_invalid',
        );

        return $checkoutEventResponse('signature_invalid', Response::HTTP_UNAUTHORIZED);
    }

    try {
        $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        $event = (string) $request->header('Foxy-Webhook-Event');
        $normalized = $adapter->toCheckoutEvent($payload, $event);
    } catch (JsonException) {
        $stepLogger->record(
            IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED,
            IntegrationStepLog::STATUS_FAILED,
            IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
            'Foxy webhook rejected: invalid JSON payload.',
            errorCode: 'invalid_json',
        );

        return $checkoutEventResponse('invalid_json', Response::HTTP_BAD_REQUEST);
    } catch (InvalidArgumentException $exception) {
        $stepLogger->record(
            IntegrationStepLog::STEP_FOXY_WEBHOOK_REJECTED,
            IntegrationStepLog::STATUS_FAILED,
            IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
            'Foxy webhook rejected: '.$exception->getMessage(),
            errorCode: $exception->getMessage(),
        );

        return $checkoutEventResponse($exception->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    $donationAttemptId = (string) ($normalized['donation_attempt_id'] ?? '');

    $stepLogger->record(
        IntegrationStepLog::STEP_FOXY_WEBHOOK_RECEIVED,
        IntegrationStepLog::STATUS_SUCCEEDED,
        IntegrationStepLog::PRODUCER_FOXY_WEBHOOK,
        'Foxy webhook received and normalized.',
        $donationAttemptId !== '' ? $donationAttemptId : null,
    );

    $result = $ingestor->ingest($normalized);
    $logCheckoutIngestResult($result, $donationAttemptId, $stepLogger);
    $dispatchHubSpotSync($result, $stepLogger);

    $checkoutEvent = $result['checkout_event'] ?? null;

    if ($checkoutEvent instanceof CheckoutEvent) {
        $handoffLinker->linkFromCheckoutEvent($checkoutEvent, (string) ($payload['id'] ?? null));
    } elseif (($result['status'] ?? '') === 'duplicate_ignored') {
        $existing = CheckoutEvent::query()
            ->where('donation_attempt_id', $normalized['donation_attempt_id'] ?? '')
            ->orWhere('transaction_id', (string) ($payload['id'] ?? ''))
            ->first();

        if ($existing instanceof CheckoutEvent) {
            $handoffLinker->linkFromCheckoutEvent($existing, (string) ($payload['id'] ?? null));
        }
    }

    return $checkoutEventResponse($result['status'], $result['code']);
})->name('foxy.webhooks.store');

Route::prefix('dashboard')->group(function () {
    Route::get('/integration-events', [DashboardIntegrationStepController::class, 'index'])
        ->name('dashboard.integration-events.index');
    Route::get('/analytics-events/by-attempt/{donationAttemptId}', [DashboardServerAnalyticsController::class, 'showByAttempt'])
        ->name('dashboard.analytics-events.by-attempt');
    Route::get('/analytics-events/{serverAnalyticsEvent}', [DashboardServerAnalyticsController::class, 'show'])
        ->whereNumber('serverAnalyticsEvent')
        ->name('dashboard.analytics-events.show');
    Route::get('/analytics-events', [DashboardServerAnalyticsController::class, 'index'])
        ->name('dashboard.analytics-events.index');
    Route::post('/crm-sync/{crmSyncAttempt}/retry', [DashboardCrmSyncRetryController::class, 'store'])
        ->whereNumber('crmSyncAttempt')
        ->name('dashboard.crm-sync.retry');
    Route::get('/handoffs', [DashboardHandoffController::class, 'index'])
        ->name('dashboard.handoffs.index');
    Route::post('/handoffs/reconcile', [DashboardHandoffReconcileController::class, 'store'])
        ->name('dashboard.handoffs.reconcile');
    Route::get('/events/by-attempt/{donationAttemptId}', [DashboardEventController::class, 'showByAttempt'])
        ->name('dashboard.events.by-attempt');
    Route::get('/events/by-cart/{cartId}', [DashboardEventController::class, 'showByCart'])
        ->whereNumber('cartId')
        ->name('dashboard.events.by-cart');
    Route::get('/events/{checkoutEvent}', [DashboardEventController::class, 'show'])
        ->whereNumber('checkoutEvent')
        ->name('dashboard.events.show');
    Route::get('/events', [DashboardEventController::class, 'index'])
        ->name('dashboard.events.index');
});
