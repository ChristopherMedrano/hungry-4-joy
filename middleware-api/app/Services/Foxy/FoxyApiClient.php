<?php

namespace App\Services\Foxy;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FoxyApiClient
{
    private const API_VERSION = '1';

    private ?string $accessToken = null;

    public function configured(): bool
    {
        return filled(config('services.foxy.client_id'))
            && filled(config('services.foxy.client_secret'))
            && filled(config('services.foxy.refresh_token'))
            && filled(config('services.foxy.store_id'));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findTransactionByDonationAttemptId(string $attemptId): ?array
    {
        if (! $this->configured()) {
            return null;
        }

        $storeId = (string) config('services.foxy.store_id');
        $filter = 'items:item_options:name[donation_attempt_id]='.urlencode($attemptId);
        $zoom = 'items,items:item_options,payments,custom_fields';
        $url = "https://api.foxycart.com/stores/{$storeId}/transactions?{$filter}&zoom={$zoom}";

        $response = Http::withToken($this->accessToken())
            ->withHeaders($this->apiHeaders())
            ->acceptJson()
            ->get($url);

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $transactions = $response->json('_embedded.fx:transactions')
            ?? $response->json('_embedded.transactions')
            ?? [];

        if (! is_array($transactions) || $transactions === []) {
            return null;
        }

        $transaction = array_values($transactions)[0];

        return is_array($transaction) ? $transaction : null;
    }

    private function accessToken(): string
    {
        if ($this->accessToken !== null) {
            return $this->accessToken;
        }

        $response = Http::asForm()
            ->acceptJson()
            ->post('https://api.foxycart.com/token', [
                'grant_type' => 'refresh_token',
                'refresh_token' => (string) config('services.foxy.refresh_token'),
                'client_id' => (string) config('services.foxy.client_id'),
                'client_secret' => (string) config('services.foxy.client_secret'),
            ]);

        if ($response->failed()) {
            throw new RuntimeException('foxy_token_refresh_failed');
        }

        $token = (string) ($response->json('access_token') ?? '');

        if ($token === '') {
            throw new RuntimeException('foxy_token_refresh_failed');
        }

        $this->accessToken = $token;

        return $this->accessToken;
    }

    /**
     * @return array<string, string>
     */
    private function apiHeaders(): array
    {
        return [
            'FOXY-API-VERSION' => self::API_VERSION,
        ];
    }
}
