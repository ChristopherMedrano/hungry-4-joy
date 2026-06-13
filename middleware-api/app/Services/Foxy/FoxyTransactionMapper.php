<?php

namespace App\Services\Foxy;

use InvalidArgumentException;

class FoxyTransactionMapper
{
    /**
     * @param  array<string, mixed>  $transaction
     * @return array<string, mixed>
     */
    public function toCheckoutEvent(array $transaction, string $eventSlug = 'reconcile'): array
    {
        $transactionId = (string) ($transaction['id'] ?? '');

        if ($transactionId === '') {
            throw new InvalidArgumentException('invalid_foxy_payload');
        }

        $item = $this->firstItem($transaction);
        $options = $this->optionsByName($item);
        $statusResolution = $this->resolveStatus($transaction);

        $payload = [
            'event_id' => "foxy_transaction_{$transactionId}_{$eventSlug}",
            'event_type' => $statusResolution['event_type'],
            'event_created_at' => $transaction['date_created'] ?? $transaction['date_modified'] ?? now()->toIso8601String(),
            'donation_attempt_id' => $this->donationAttemptId($transaction, $options, $transactionId),
            'checkout_provider' => 'foxy',
            'checkout_session_id' => (string) ($transaction['cart'] ?? $transaction['cart_id'] ?? "foxy_transaction_{$transactionId}"),
            'transaction_id' => $transactionId,
            'transaction_status' => $statusResolution['transaction_status'],
            'idempotency_key' => "foxy_transaction_{$transactionId}_{$eventSlug}",
            'source_page' => (string) ($options['source_page'] ?? 'foxy_webhook'),
            'campaign' => [
                'campaign_id' => (string) ($item['code'] ?? $options['campaign_id'] ?? 'foxy-donation'),
                'campaign_name' => (string) ($options['campaign_name'] ?? $item['name'] ?? 'Foxy Donation'),
            ],
            'donation' => [
                'amount' => $this->donationAmount($transaction, $item),
                'currency' => (string) ($transaction['currency_code'] ?? $transaction['currency'] ?? 'USD'),
                'donation_label' => (string) ($options['donation_label'] ?? $item['name'] ?? 'Foxy donation'),
                'donation_type' => (string) ($options['donation_type'] ?? 'one_time'),
            ],
            'donor' => [
                'email' => (string) ($transaction['customer_email'] ?? $transaction['email'] ?? ''),
                'first_name' => (string) ($transaction['customer_first_name'] ?? $transaction['first_name'] ?? ''),
                'last_name' => (string) ($transaction['customer_last_name'] ?? $transaction['last_name'] ?? ''),
                'phone' => $transaction['customer_phone'] ?? $transaction['phone'] ?? null,
            ],
        ];

        if ($statusResolution['event_type'] === 'payment.failed') {
            $payload['failure'] = $statusResolution['failure'];
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @return array{event_type: string, transaction_status: string, failure?: array<string, string>}
     */
    public function resolveStatus(array $transaction): array
    {
        $rawStatus = strtolower(trim((string) ($transaction['status'] ?? $transaction['transaction_status'] ?? '')));

        if (in_array($rawStatus, ['completed', 'approved', 'authorized', 'captured', 'verified'], true)) {
            return [
                'event_type' => 'donation.created',
                'transaction_status' => $rawStatus === 'completed' ? 'completed' : 'completed',
            ];
        }

        if (in_array($rawStatus, ['declined', 'rejected', 'failed'], true)) {
            return [
                'event_type' => 'payment.failed',
                'transaction_status' => 'failed',
                'failure' => $this->failureEnvelope($transaction, $rawStatus === '' ? 'declined' : $rawStatus),
            ];
        }

        if ($rawStatus === 'pending') {
            return [
                'event_type' => 'donation.created',
                'transaction_status' => 'pending',
            ];
        }

        if ($rawStatus === '') {
            $dataIsFed = $transaction['data_is_fed'] ?? null;

            if ($dataIsFed === false || $dataIsFed === 'false' || $dataIsFed === 0) {
                return [
                    'event_type' => 'payment.failed',
                    'transaction_status' => 'failed',
                    'failure' => $this->failureEnvelope($transaction, 'incomplete'),
                ];
            }

            return [
                'event_type' => 'donation.created',
                'transaction_status' => 'pending',
            ];
        }

        return [
            'event_type' => 'payment.failed',
            'transaction_status' => 'failed',
            'failure' => $this->failureEnvelope($transaction, $rawStatus),
        ];
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @return array<string, string>
     */
    private function failureEnvelope(array $transaction, string $providerStatus): array
    {
        $failureCode = match (true) {
            in_array($providerStatus, ['declined', 'rejected'], true) => 'card_declined',
            $providerStatus === 'incomplete' => 'checkout_incomplete',
            default => 'payment_failed',
        };

        $message = match ($failureCode) {
            'card_declined' => 'Payment was declined by the checkout provider.',
            'checkout_incomplete' => 'Checkout did not complete successfully.',
            default => 'Payment could not be completed.',
        };

        $paymentLog = $this->firstPaymentLogMessage($transaction);

        if ($paymentLog !== null && $paymentLog !== '') {
            $message = $this->redactFailureMessage($paymentLog);
        }

        return [
            'failure_code' => $failureCode,
            'failure_message' => $message,
            'provider_status' => $providerStatus,
        ];
    }

    /**
     * @param  array<string, mixed>  $transaction
     */
    private function firstPaymentLogMessage(array $transaction): ?string
    {
        $payments = $transaction['_embedded']['fx:payments']
            ?? $transaction['_embedded']['payments']
            ?? $transaction['payments']
            ?? [];

        if (! is_array($payments)) {
            return null;
        }

        foreach ($payments as $payment) {
            if (! is_array($payment)) {
                continue;
            }

            $message = $payment['message'] ?? $payment['processor_response'] ?? null;

            if (is_string($message) && $message !== '') {
                return $message;
            }
        }

        return null;
    }

    private function redactFailureMessage(string $message): string
    {
        $redacted = preg_replace('/\b\d{13,19}\b/', '[redacted]', $message) ?? $message;

        return mb_substr(trim($redacted), 0, 500);
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @return array<string, mixed>
     */
    private function firstItem(array $transaction): array
    {
        $items = $transaction['_embedded']['fx:items']
            ?? $transaction['_embedded']['items']
            ?? $transaction['items']
            ?? [];

        if (! is_array($items) || $items === []) {
            throw new InvalidArgumentException('invalid_foxy_payload');
        }

        $item = array_values($items)[0];

        if (! is_array($item)) {
            throw new InvalidArgumentException('invalid_foxy_payload');
        }

        return $item;
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array<string, mixed>
     */
    private function optionsByName(array $item): array
    {
        $options = $item['options']
            ?? $item['_embedded']['fx:item_options']
            ?? $item['_embedded']['fx:options']
            ?? [];

        $mapped = [];

        if (! is_array($options)) {
            return $mapped;
        }

        foreach ($options as $option) {
            if (! is_array($option)) {
                continue;
            }

            $name = $option['name'] ?? $option['code'] ?? null;
            $value = $option['value'] ?? $option['display_value'] ?? null;

            if (is_string($name) && $value !== null) {
                $mapped[$name] = $value;
            }
        }

        return $mapped;
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @param  array<string, mixed>  $options
     */
    private function donationAttemptId(array $transaction, array $options, string $transactionId): string
    {
        $fromItemOption = (string) ($options['donation_attempt_id'] ?? '');

        if ($fromItemOption !== '') {
            return $fromItemOption;
        }

        $fromCustomField = (string) ($this->customFieldsByName($transaction)['donation_attempt_id'] ?? '');

        if ($fromCustomField !== '') {
            return $fromCustomField;
        }

        return "h4j_attempt_foxy_transaction_{$transactionId}";
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @return array<string, mixed>
     */
    private function customFieldsByName(array $transaction): array
    {
        $customFields = $transaction['_embedded']['fx:custom_fields']
            ?? $transaction['custom_fields']
            ?? [];

        $mapped = [];

        if (! is_array($customFields)) {
            return $mapped;
        }

        foreach ($customFields as $field) {
            if (! is_array($field)) {
                continue;
            }

            $name = $field['name'] ?? null;
            $value = $field['value'] ?? null;

            if (is_string($name) && $value !== null) {
                $mapped[$name] = $value;
            }
        }

        return $mapped;
    }

    /**
     * @param  array<string, mixed>  $transaction
     * @param  array<string, mixed>  $item
     */
    private function donationAmount(array $transaction, array $item): mixed
    {
        if (isset($item['price'])) {
            return $item['price'];
        }

        return $transaction['total_order'] ?? $transaction['total'] ?? 0;
    }
}
