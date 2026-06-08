<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;

class FakeHubSpotClient implements HubSpotClient
{
    /**
     * @var array<int, array<string, mixed>>
     */
    private array $calls = [];

    public function __construct(private readonly bool $enabled = false) {}

    public function enabled(): bool
    {
        return $this->enabled;
    }

    public function upsertContact(string $email, string $firstname, string $lastname, ?string $phone = null): string
    {
        $this->calls[] = [
            'method' => 'upsertContact',
            'email' => $email,
            'firstname' => $firstname,
            'lastname' => $lastname,
            'phone' => $phone,
        ];

        return 'fake_contact_'.str_replace(['@', '.', '+', '-'], '_', strtolower($email));
    }

    public function createDeal(array $properties): string
    {
        $this->calls[] = [
            'method' => 'createDeal',
            'properties' => $properties,
        ];

        return 'fake_deal_'.count(array_filter(
            $this->calls,
            fn (array $call): bool => $call['method'] === 'createDeal'
        ));
    }

    public function associateDealToContact(string $dealId, string $contactId): void
    {
        $this->calls[] = [
            'method' => 'associateDealToContact',
            'dealId' => $dealId,
            'contactId' => $contactId,
        ];
    }

    public function addContactToList(string $contactId, string $listId): array
    {
        $this->calls[] = [
            'method' => 'addContactToList',
            'contactId' => $contactId,
            'listId' => $listId,
        ];

        return ['ok' => true, 'error' => null];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    public function calls(): array
    {
        return $this->calls;
    }
}
