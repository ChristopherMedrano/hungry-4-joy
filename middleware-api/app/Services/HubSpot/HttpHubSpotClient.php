<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class HttpHubSpotClient implements HubSpotClient
{
    private const BASE_URL = 'https://api.hubapi.com';

    public function __construct(private readonly string $accessToken) {}

    public function enabled(): bool
    {
        return filled($this->accessToken);
    }

    public function upsertContact(string $email, string $firstname, string $lastname, ?string $phone = null): string
    {
        $properties = [
            'email' => $email,
            'firstname' => $firstname,
            'lastname' => $lastname,
        ];

        if (filled($phone)) {
            $properties['phone'] = $phone;
        }

        $response = $this->request()->post(self::BASE_URL.'/crm/v3/objects/contacts/batch/upsert', [
            'inputs' => [
                [
                    'idProperty' => 'email',
                    'id' => $email,
                    'properties' => $properties,
                ],
            ],
        ]);

        $this->throwSafeFailure($response, 'HubSpot contact upsert failed');

        $contactId = data_get($response->json(), 'results.0.id');

        if (! filled($contactId)) {
            throw new RuntimeException('HubSpot contact upsert did not return an id.');
        }

        return (string) $contactId;
    }

    public function createDeal(array $properties): string
    {
        $response = $this->request()->post(self::BASE_URL.'/crm/v3/objects/deals', [
            'properties' => $properties,
        ]);

        $this->throwSafeFailure($response, 'HubSpot deal creation failed');

        $dealId = data_get($response->json(), 'id');

        if (! filled($dealId)) {
            throw new RuntimeException('HubSpot deal creation did not return an id.');
        }

        return (string) $dealId;
    }

    public function associateDealToContact(string $dealId, string $contactId): void
    {
        $response = $this->request()->put(
            self::BASE_URL."/crm/v3/objects/deals/{$dealId}/associations/contacts/{$contactId}/3"
        );

        $this->throwSafeFailure($response, 'HubSpot deal/contact association failed');
    }

    public function addContactToList(string $contactId, string $listId): array
    {
        $response = $this->request()->put(
            self::BASE_URL."/crm/lists/2026-03/{$listId}/memberships/add",
            [$contactId],
        );

        if ($response->failed()) {
            return [
                'ok' => false,
                'error' => 'HubSpot list enrollment failed with status '.$response->status().'.',
            ];
        }

        return ['ok' => true, 'error' => null];
    }

    private function request(): PendingRequest
    {
        return Http::withToken($this->accessToken)
            ->acceptJson()
            ->asJson()
            ->timeout(10);
    }

    private function throwSafeFailure(Response $response, string $message): void
    {
        if ($response->failed()) {
            throw new RuntimeException($message.' with status '.$response->status().'.');
        }
    }
}
