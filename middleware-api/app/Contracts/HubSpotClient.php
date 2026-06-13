<?php

namespace App\Contracts;

interface HubSpotClient
{
    public function enabled(): bool;

    public function upsertContact(string $email, string $firstname, string $lastname, ?string $phone = null): string;

    /**
     * @param  array<string, mixed>  $properties
     */
    public function createDeal(array $properties): string;

    public function associateDealToContact(string $dealId, string $contactId): void;

    /**
     * @return array{ok: bool, error: string|null}
     */
    public function addContactToList(string $contactId, string $listId): array;

    public function getDealDonationAttemptId(string $dealId): ?string;
}
