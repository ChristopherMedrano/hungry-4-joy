<?php

namespace Tests\Unit;

use App\Contracts\HubSpotClient;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HttpHubSpotClient;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class HubSpotClientTest extends TestCase
{
    protected function tearDown(): void
    {
        Http::preventStrayRequests(false);

        parent::tearDown();
    }

    public function test_hubspot_config_defaults_to_disabled_with_newsletter_list_id(): void
    {
        $this->assertFalse(config('services.hubspot.enabled'));
        $this->assertNull(config('services.hubspot.access_token'));
        $this->assertSame('9', config('services.hubspot.newsletter_list_id'));
    }

    public function test_fake_client_records_calls_and_returns_fake_ids(): void
    {
        $client = new FakeHubSpotClient(enabled: true);

        $contactId = $client->upsertContact(
            email: 'jordan.helper@example.test',
            firstname: 'Jordan',
            lastname: 'Helper',
            phone: '555-0104',
        );
        $dealId = $client->createDeal([
            'dealname' => 'Loaves 4 Joy - 3 loaves',
            'amount' => 25,
            'h4j_donation_attempt_id' => 'h4j_attempt_demo_test_0001',
        ]);
        $client->associateDealToContact($dealId, $contactId);
        $listResult = $client->addContactToList($contactId, '9');

        $this->assertSame('fake_contact_jordan_helper_example_test', $contactId);
        $this->assertSame('fake_deal_1', $dealId);
        $this->assertSame(['ok' => true, 'error' => null], $listResult);
        $this->assertTrue($client->enabled());
        $this->assertSame([
            [
                'method' => 'upsertContact',
                'email' => 'jordan.helper@example.test',
                'firstname' => 'Jordan',
                'lastname' => 'Helper',
                'phone' => '555-0104',
            ],
            [
                'method' => 'createDeal',
                'properties' => [
                    'dealname' => 'Loaves 4 Joy - 3 loaves',
                    'amount' => 25,
                    'h4j_donation_attempt_id' => 'h4j_attempt_demo_test_0001',
                ],
            ],
            [
                'method' => 'associateDealToContact',
                'dealId' => 'fake_deal_1',
                'contactId' => 'fake_contact_jordan_helper_example_test',
            ],
            [
                'method' => 'addContactToList',
                'contactId' => 'fake_contact_jordan_helper_example_test',
                'listId' => '9',
            ],
        ], $client->calls());
    }

    public function test_fake_client_can_represent_disabled_state(): void
    {
        $client = new FakeHubSpotClient();

        $this->assertFalse($client->enabled());
    }
}
