<?php

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

Route::post('/checkout/events', function (Request $request, CheckoutEventIngestor $ingestor) use ($checkoutEventResponse) {
    $result = $ingestor->ingest($request->all());

    return $checkoutEventResponse($result['status'], $result['code']);
})->name('checkout.events.store');

Route::post('/foxy/webhooks', function (
    Request $request,
    FoxyWebhookVerifier $verifier,
    FoxyWebhookAdapter $adapter,
    CheckoutEventIngestor $ingestor
) use ($checkoutEventResponse) {
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

    return $checkoutEventResponse($result['status'], $result['code']);
})->name('foxy.webhooks.store');
