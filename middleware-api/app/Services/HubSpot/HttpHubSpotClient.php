<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;

class HttpHubSpotClient implements HubSpotClient
{
    public function __construct(private readonly string $accessToken) {}

    public function enabled(): bool
    {
        return filled($this->accessToken);
    }

    public function upsertContact(string $email, string $firstname, string $lastname, ?string $phone = null): string
    {
        throw new \RuntimeException('HubSpot HTTP contact upsert is blocked until Task 4 replaces this shell.');
    }

    public function createDeal(array $properties): string
    {
        throw new \RuntimeException('HubSpot HTTP deal creation is blocked until Task 4 replaces this shell.');
    }

    public function associateDealToContact(string $dealId, string $contactId): void
    {
        throw new \RuntimeException('HubSpot HTTP deal association is blocked until Task 4 replaces this shell.');
    }

    public function addContactToList(string $contactId, string $listId): array
    {
        throw new \RuntimeException('HubSpot HTTP list enrollment is blocked until Task 4 replaces this shell.');
    }
}
