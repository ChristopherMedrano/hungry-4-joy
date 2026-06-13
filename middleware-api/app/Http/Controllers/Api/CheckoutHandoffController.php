<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\CheckoutHandoffRegistrar;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CheckoutHandoffController extends Controller
{
    public function __construct(private readonly CheckoutHandoffRegistrar $registrar) {}

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
}
