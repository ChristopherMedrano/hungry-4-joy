<?php

namespace App\Services;

use App\Services\Foxy\FoxyTransactionMapper;
use InvalidArgumentException;

class FoxyWebhookAdapter
{
    public function __construct(private readonly FoxyTransactionMapper $mapper) {}

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function toCheckoutEvent(array $payload, string $event): array
    {
        if (! in_array($event, ['transaction/created', 'transaction/refeed', 'transaction/modified'], true)) {
            throw new InvalidArgumentException('unsupported_foxy_event');
        }

        $transactionId = (string) ($payload['id'] ?? '');

        if ($transactionId === '') {
            throw new InvalidArgumentException('invalid_foxy_payload');
        }

        $eventSlug = match ($event) {
            'transaction/refeed' => 'transaction_created',
            'transaction/modified' => 'transaction_modified',
            default => 'transaction_created',
        };

        return $this->mapper->toCheckoutEvent($payload, $eventSlug);
    }
}
