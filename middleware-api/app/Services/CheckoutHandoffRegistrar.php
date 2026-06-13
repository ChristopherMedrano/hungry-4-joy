<?php

namespace App\Services;

use App\Models\CheckoutHandoff;
use App\Services\Foxy\FoxyReconciliationService;
use Illuminate\Database\QueryException;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CheckoutHandoffRegistrar
{
    public function __construct(private readonly FoxyReconciliationService $reconciler) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array{status: string, code: int, handoff: CheckoutHandoff|null}
     *
     * @throws ValidationException
     */
    public function register(array $payload): array
    {
        if (! config('checkout.handoff_registration_enabled', true)) {
            return [
                'status' => 'handoff_registration_disabled',
                'code' => Response::HTTP_SERVICE_UNAVAILABLE,
                'handoff' => null,
            ];
        }

        $validated = Validator::make($payload, $this->rules())->validate();
        $now = now();

        try {
            $handoff = CheckoutHandoff::create([
                'donation_attempt_id' => $validated['donation_attempt_id'],
                'handoff_status' => CheckoutHandoff::STATUS_CART_HANDOFF_CREATED,
                'handoff_at' => $validated['handoff_at'] ?? $now,
                'next_reconcile_at' => $now,
                'reconcile_attempts' => 0,
                'checkout_provider' => $validated['checkout_provider'],
                'source_page' => $validated['source_page'],
                'campaign_id' => $validated['campaign_id'],
                'campaign_name' => $validated['campaign_name'],
                'donation_amount' => $validated['donation_amount'],
                'donation_currency' => $validated['donation_currency'] ?? 'USD',
                'donation_label' => $validated['donation_label'],
                'donation_type' => $validated['donation_type'],
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueConstraintViolation($exception)) {
                throw $exception;
            }

            $handoff = CheckoutHandoff::query()
                ->where('donation_attempt_id', $validated['donation_attempt_id'])
                ->first();

            if (! $handoff instanceof CheckoutHandoff) {
                throw $exception;
            }

            return [
                'status' => 'handoff_already_registered',
                'code' => Response::HTTP_OK,
                'handoff' => $handoff,
            ];
        }

        $this->reconciler->reconcile($handoff);

        return [
            'status' => 'handoff_registered',
            'code' => Response::HTTP_ACCEPTED,
            'handoff' => $handoff->fresh(),
        ];
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        return in_array($exception->getCode(), ['23000', '23505'], true);
    }

    /**
     * @return array<string, array<int, string>>
     */
    private function rules(): array
    {
        return [
            'donation_attempt_id' => ['required', 'string', 'max:128', 'regex:/^h4j_attempt_[A-Za-z0-9_-]+$/'],
            'handoff_at' => ['nullable', 'date'],
            'checkout_provider' => ['required', 'string', 'in:foxy'],
            'source_page' => ['required', 'string', 'max:64'],
            'campaign_id' => ['required', 'string', 'max:128'],
            'campaign_name' => ['required', 'string', 'max:255'],
            'donation_amount' => ['required', 'numeric', 'min:0.01'],
            'donation_currency' => ['nullable', 'string', 'in:USD'],
            'donation_label' => ['required', 'string', 'max:255'],
            'donation_type' => ['required', 'string', 'in:one_time'],
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
        ];
    }
}
