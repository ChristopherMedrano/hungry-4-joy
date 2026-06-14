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

    /**
     * @return array<string, mixed>|null
     */
    public function findCartById(string $cartId): ?array
    {
        if (! $this->configured()) {
            return null;
        }

        $zoom = 'items,items:item_options';
        $url = "https://api.foxycart.com/carts/{$cartId}?zoom={$zoom}";

        $response = Http::withToken($this->accessToken())
            ->withHeaders($this->apiHeaders())
            ->acceptJson()
            ->get($url);

        if ($response->status() === 404) {
            return null;
        }

        if ($response->failed()) {
            throw new RequestException($response);
        }

        $cart = $response->json();

        return is_array($cart) ? $cart : null;
    }

    /**
     * @param  array<string, mixed>  $cart
     * @return list<string>
     */
    public function donationAttemptIdsFromCart(array $cart): array
    {
        $items = $cart['_embedded']['fx:items']
            ?? $cart['_embedded']['items']
            ?? $cart['items']
            ?? [];

        if (! is_array($items)) {
            return [];
        }

        $attemptIds = [];

        foreach ($items as $item) {
            if (! is_array($item)) {
                continue;
            }

            $options = $item['options']
                ?? $item['_embedded']['fx:item_options']
                ?? $item['_embedded']['fx:options']
                ?? [];

            if (! is_array($options)) {
                continue;
            }

            foreach ($options as $option) {
                if (! is_array($option)) {
                    continue;
                }

                $name = $option['name'] ?? $option['code'] ?? null;
                $value = $option['value'] ?? $option['display_value'] ?? null;

                if ($name === 'donation_attempt_id' && is_string($value) && $value !== '') {
                    $attemptIds[] = $value;
                }
            }
        }

        return array_values(array_unique($attemptIds));
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
