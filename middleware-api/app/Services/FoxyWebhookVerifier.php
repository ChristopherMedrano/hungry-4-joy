<?php

namespace App\Services;

/**
 * Verifies the signature of a Foxy webhook payload.
 */
class FoxyWebhookVerifier
{
    public function configured(): bool
    {
        return filled($this->encryptionKey());
    }

    public function valid(string $body, ?string $signature): bool
    {
        $encryptionKey = $this->encryptionKey();

        if (! filled($encryptionKey) || ! filled($signature)) {
            return false;
        }

        $expected = hash_hmac('sha256', $body, $encryptionKey);

        return hash_equals($expected, $signature);
    }

    private function encryptionKey(): ?string
    {
        return config('services.foxy.webhook_encryption_key');
    }
}
