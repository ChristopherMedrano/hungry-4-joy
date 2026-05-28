<?php

namespace App\Services;

use App\Models\CheckoutEvent;
use Illuminate\Database\QueryException;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/**
 * Service to ingest a checkout event into the wordpress database.
 */
class CheckoutEventIngestor
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array{status: string, code: int}
     *
     * @throws ValidationException
     */
    public function ingest(array $payload): array
    {
        $validated = Validator::make($payload, $this->rules())->validate();

        if (CheckoutEvent::where('event_id', $validated['event_id'])
            ->orWhere('idempotency_key', $validated['idempotency_key'])
            ->exists()) {
            return [
                'status' => 'duplicate_ignored',
                'code' => Response::HTTP_OK,
            ];
        }

        try {
            CheckoutEvent::create([
                'event_id' => $validated['event_id'],
                'event_type' => $validated['event_type'],
                'event_created_at' => $validated['event_created_at'],
                'checkout_provider' => $validated['checkout_provider'],
                'checkout_session_id' => $validated['checkout_session_id'],
                'transaction_id' => $validated['transaction_id'] ?? null,
                'transaction_status' => $validated['transaction_status'],
                'idempotency_key' => $validated['idempotency_key'],
                'source_page' => $validated['source_page'],
                'campaign_id' => $validated['campaign']['campaign_id'],
                'campaign_name' => $validated['campaign']['campaign_name'],
                'donation_amount' => $validated['donation']['amount'],
                'donation_currency' => $validated['donation']['currency'],
                'donation_label' => $validated['donation']['donation_label'],
                'donation_type' => $validated['donation']['donation_type'],
                'donor_email' => $validated['donor']['email'],
                'donor_first_name' => $validated['donor']['first_name'],
                'donor_last_name' => $validated['donor']['last_name'],
                'donor_phone' => $validated['donor']['phone'] ?? null,
                'failure_code' => $validated['failure']['failure_code'] ?? null,
                'failure_message' => $validated['failure']['failure_message'] ?? null,
                'failure_provider_status' => $validated['failure']['provider_status'] ?? null,
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueConstraintViolation($exception)) {
                throw $exception;
            }

            return [
                'status' => 'duplicate_ignored',
                'code' => Response::HTTP_OK,
            ];
        }

        return [
            'status' => 'accepted',
            'code' => Response::HTTP_ACCEPTED,
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
        ];
    }
}
