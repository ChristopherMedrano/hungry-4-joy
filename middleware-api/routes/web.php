<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'service' => 'hungry-4-joy-middleware-api',
        'status' => 'ok',
    ]);
});
