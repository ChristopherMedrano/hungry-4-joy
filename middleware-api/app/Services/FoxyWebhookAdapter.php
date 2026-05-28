<?php

namespace App\Services;

use InvalidArgumentException;

class FoxyWebhookAdapter
{
    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function toCheckoutEvent(array $payload, string $event): array
    {
        if (! in_array($event, ['transaction/created', 'transaction/refeed'], true)) {
            throw new InvalidArgumentException('unsupported_foxy_event');
        }

        $transactionId = (string) ($payload['id'] ?? '');
        if ($transactionId === '') {
            throw new InvalidArgumentException('invalid_foxy_payload');
        }

        $item = $this->firstItem($payload);
        $options = $this->optionsByName($item);
        $eventSlug = 'transaction_created';

        return [
            'event_id' => "foxy_transaction_{$transactionId}_{$eventSlug}",
            'event_type' => 'donation.created',
            'event_created_at' => $payload['date_created'] ?? $payload['date_modified'] ?? now()->toIso8601String(),
            'checkout_provider' => 'foxy',
            'checkout_session_id' => (string) ($payload['cart'] ?? $payload['cart_id'] ?? "foxy_transaction_{$transactionId}"),
            'transaction_id' => $transactionId,
            'transaction_status' => $this->transactionStatus($payload),
            'idempotency_key' => "foxy_transaction_{$transactionId}_{$eventSlug}",
            'source_page' => (string) ($options['source_page'] ?? 'foxy_webhook'),
            'campaign' => [
                'campaign_id' => (string) ($item['code'] ?? $options['campaign_id'] ?? 'foxy-donation'),
                'campaign_name' => (string) ($options['campaign_name'] ?? $item['name'] ?? 'Foxy Donation'),
            ],
            'donation' => [
                'amount' => $this->donationAmount($payload, $item),
                'currency' => (string) ($payload['currency_code'] ?? $payload['currency'] ?? 'USD'),
                'donation_label' => (string) ($options['donation_label'] ?? $item['name'] ?? 'Foxy donation'),
                'donation_type' => (string) ($options['donation_type'] ?? 'one_time'),
            ],
            'donor' => [
                'email' => (string) ($payload['customer_email'] ?? $payload['email'] ?? ''),
                'first_name' => (string) ($payload['customer_first_name'] ?? $payload['first_name'] ?? ''),
                'last_name' => (string) ($payload['customer_last_name'] ?? $payload['last_name'] ?? ''),
                'phone' => $payload['customer_phone'] ?? $payload['phone'] ?? null,
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function firstItem(array $payload): array
    {
        $items = $payload['_embedded']['fx:items']
            ?? $payload['_embedded']['items']
            ?? $payload['items']
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
     * @param  array<string, mixed>  $payload
     */
    private function transactionStatus(array $payload): string
    {
        $status = strtolower((string) ($payload['status'] ?? $payload['transaction_status'] ?? 'completed'));

        return in_array($status, ['completed', 'failed', 'pending'], true) ? $status : 'completed';
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $item
     */
    private function donationAmount(array $payload, array $item): mixed
    {
        if (isset($item['price'])) {
            return $item['price'];
        }

        return $payload['total_order'] ?? $payload['total'] ?? 0;
    }
}
