<?php

use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'ok',
    ]);
});

Route::post('/checkout/events', function (Request $request) {
    $request->validate([
        'event_id' => ['required', 'string', 'max:128'],
        'event_type' => ['required', 'string', 'in:donation.created,payment.failed'],
        'event_created_at' => ['required', 'date'],
        'checkout_provider' => ['required', 'string', 'in:foxy'],
        'checkout_session_id' => ['required', 'string', 'max:128'],
        'transaction_id' => ['nullable', 'string', 'max:128', 'required_if:event_type,donation.created'],
        'transaction_status' => ['required', 'string', 'in:completed,failed,pending'],
        'idempotency_key' => ['required', 'string', 'max:128'],
        'source_page' => ['required', 'string', 'max:64'],
        'campaign' => ['required', 'array'],
        'campaign.campaign_id' => ['required', 'string', 'max:128'],
        'campaign.campaign_name' => ['required', 'string', 'max:255'],
        'donation' => ['required', 'array'],
        'donation.amount' => ['required', 'numeric', 'min:0.01'],
        'donation.currency' => ['required', 'string', 'in:USD'],
        'donation.donation_label' => ['required', 'string', 'max:255'],
        'donation.donation_type' => ['required', 'string', 'in:one_time'],
        'donor' => ['required', 'array'],
        'donor.email' => ['required', 'email', 'max:255'],
        'donor.first_name' => ['required', 'string', 'max:100'],
        'donor.last_name' => ['required', 'string', 'max:100'],
        'donor.phone' => ['nullable', 'string', 'max:50'],
        'failure' => ['required_if:event_type,payment.failed', 'array'],
        'failure.failure_code' => ['required_if:event_type,payment.failed', 'string', 'max:100'],
        'failure.failure_message' => ['required_if:event_type,payment.failed', 'string', 'max:500'],
        'failure.provider_status' => ['required_if:event_type,payment.failed', 'string', 'max:100'],
        'card_number' => ['prohibited'],
        'cvv' => ['prohibited'],
        'cvc' => ['prohibited'],
        'api_key' => ['prohibited'],
        'authorization' => ['prohibited'],
        'access_token' => ['prohibited'],
        'client_secret' => ['prohibited'],
        'payment_credential' => ['prohibited'],
        'payment_method_secret' => ['prohibited'],
        'raw_payment' => ['prohibited'],
    ]);

    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'accepted',
    ], Response::HTTP_ACCEPTED);
})->name('checkout.events.store');
