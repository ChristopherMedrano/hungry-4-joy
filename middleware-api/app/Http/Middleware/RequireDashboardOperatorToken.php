<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

class RequireDashboardOperatorToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $failureKey = 'dashboard-operator-auth-failures';
        $failureLimit = (int) config('access_control.operator_auth_failures_per_minute', 60);
        $failureLimitReached = RateLimiter::tooManyAttempts($failureKey, $failureLimit);
        $configuredToken = config('services.dashboard.operator_token');
        $authorization = $request->header('Authorization');
        $presentedToken = null;

        if (is_string($authorization)
            && preg_match('/\ABearer ([^\s]+)\z/D', $authorization, $matches) === 1) {
            $presentedToken = $matches[1];
        }

        $valid = is_string($configuredToken)
            && $configuredToken !== ''
            && is_string($presentedToken)
            && hash_equals($configuredToken, $presentedToken);

        if ($valid) {
            return $next($request);
        }

        if ($failureLimitReached) {
            return response()
                ->json(['message' => 'Too Many Attempts.'], Response::HTTP_TOO_MANY_REQUESTS)
                ->header('Retry-After', (string) RateLimiter::availableIn($failureKey));
        }

        RateLimiter::hit($failureKey, 60);

        return $this->unauthorized();
    }

    private function unauthorized(): JsonResponse
    {
        return response()
            ->json(['message' => 'Authentication required.'], Response::HTTP_UNAUTHORIZED)
            ->header('WWW-Authenticate', 'Bearer');
    }
}
