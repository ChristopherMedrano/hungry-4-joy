<?php

use Illuminate\Http\Response;
use Illuminate\Support\Facades\Route;

Route::get('/health', function () {
    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'ok',
    ]);
});

Route::post('/checkout/events', function () {
    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'accepted',
    ], Response::HTTP_ACCEPTED);
})->name('checkout.events.store');
