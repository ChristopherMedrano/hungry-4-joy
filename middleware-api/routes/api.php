<?php

use App\Http\Controllers\Api\CheckoutHandoffController;
use App\Http\Controllers\Api\DashboardCrmSyncRetryController;
use App\Http\Controllers\Api\DashboardEventController;
use App\Http\Controllers\Api\DashboardServerAnalyticsController;
use App\Services\CheckoutHandoffLinker;
use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use App\Services\CheckoutEventIngestor;
use App\Services\FoxyWebhookAdapter;
use App\Services\FoxyWebhookVerifier;
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

$checkoutEventResponse = fn (string $status, int $code = Response::HTTP_OK) => response()->json([
    'service' => 'hungry-4-joy-middleware-api',
    'status' => $status,
], $code);

$dispatchHubSpotSync = function (array $result): void {
    $checkoutEvent = $result['checkout_event'] ?? null;

    if ($checkoutEvent instanceof CheckoutEvent && $checkoutEvent->hubSpotSyncEligible()) {
        SyncDonationToHubSpot::dispatch($checkoutEvent->id);
    }
};

Route::post('/checkout/handoffs/reconcile', [CheckoutHandoffController::class, 'reconcile'])
    ->name('checkout.handoffs.reconcile');

Route::post('/checkout/handoffs', [CheckoutHandoffController::class, 'store'])
    ->name('checkout.handoffs.store');

Route::post('/checkout/events', function (
    Request $request,
    CheckoutEventIngestor $ingestor
) use ($checkoutEventResponse, $dispatchHubSpotSync) {
    abort_if(app()->isProduction(), Response::HTTP_NOT_FOUND);

    $result = $ingestor->ingest($request->all());
    $dispatchHubSpotSync($result);

    return $checkoutEventResponse($result['status'], $result['code']);
})->name('checkout.events.store');

Route::post('/foxy/webhooks', function (
    Request $request,
    FoxyWebhookVerifier $verifier,
    FoxyWebhookAdapter $adapter,
    CheckoutEventIngestor $ingestor,
    CheckoutHandoffLinker $handoffLinker
) use ($checkoutEventResponse, $dispatchHubSpotSync) {
    if (! $verifier->configured()) {
        return $checkoutEventResponse('webhook_not_configured', Response::HTTP_SERVICE_UNAVAILABLE);
    }

    $body = $request->getContent();

    if (! $verifier->valid($body, $request->header('Foxy-Webhook-Signature'))) {
        return $checkoutEventResponse('signature_invalid', Response::HTTP_UNAUTHORIZED);
    }

    try {
        $payload = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
        $event = (string) $request->header('Foxy-Webhook-Event');
        $normalized = $adapter->toCheckoutEvent($payload, $event);
    } catch (JsonException) {
        return $checkoutEventResponse('invalid_json', Response::HTTP_BAD_REQUEST);
    } catch (InvalidArgumentException $exception) {
        return $checkoutEventResponse($exception->getMessage(), Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    $result = $ingestor->ingest($normalized);
    $dispatchHubSpotSync($result);

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
    Route::get('/events/by-attempt/{donationAttemptId}', [DashboardEventController::class, 'showByAttempt'])
        ->name('dashboard.events.by-attempt');
    Route::get('/events/{checkoutEvent}', [DashboardEventController::class, 'show'])
        ->whereNumber('checkoutEvent')
        ->name('dashboard.events.show');
    Route::get('/events', [DashboardEventController::class, 'index'])
        ->name('dashboard.events.index');
});
