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

    public function test_container_binds_fake_client_when_hubspot_is_disabled(): void
    {
        config([
            'services.hubspot.enabled' => false,
            'services.hubspot.access_token' => 'pat-test-token',
        ]);

        $client = app(HubSpotClient::class);

        $this->assertInstanceOf(FakeHubSpotClient::class, $client);
        $this->assertFalse($client->enabled());
    }

    public function test_container_binds_fake_client_when_token_is_missing(): void
    {
        config([
            'services.hubspot.enabled' => true,
            'services.hubspot.access_token' => '',
        ]);

        $client = app(HubSpotClient::class);

        $this->assertInstanceOf(FakeHubSpotClient::class, $client);
        $this->assertFalse($client->enabled());
    }

    public function test_container_binds_http_client_only_when_enabled_with_token(): void
    {
        config([
            'services.hubspot.enabled' => true,
            'services.hubspot.access_token' => 'pat-test-token',
        ]);

        $client = app(HubSpotClient::class);

        $this->assertInstanceOf(HttpHubSpotClient::class, $client);
        $this->assertTrue($client->enabled());
    }

    public function test_http_client_upserts_contact_without_real_network(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert' => Http::response([
                'results' => [
                    ['id' => '12345'],
                ],
            ]),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $contactId = $client->upsertContact(
            email: 'jordan.helper@example.test',
            firstname: 'Jordan',
            lastname: 'Helper',
            phone: '555-0104',
        );

        $this->assertSame('12345', $contactId);
        Http::assertSent(function ($request): bool {
            return $request->method() === 'POST'
                && $request->url() === 'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert'
                && $request->hasHeader('Authorization', 'Bearer pat-test-token')
                && $request['inputs'][0]['idProperty'] === 'email'
                && $request['inputs'][0]['id'] === 'jordan.helper@example.test'
                && $request['inputs'][0]['properties'] === [
                    'email' => 'jordan.helper@example.test',
                    'firstname' => 'Jordan',
                    'lastname' => 'Helper',
                    'phone' => '555-0104',
                ];
        });
    }

    public function test_http_client_omits_empty_phone_on_contact_upsert(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert' => Http::response([
                'results' => [
                    ['id' => '12345'],
                ],
            ]),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $client->upsertContact('jordan.helper@example.test', 'Jordan', 'Helper');

        Http::assertSent(function ($request): bool {
            return ! array_key_exists('phone', $request['inputs'][0]['properties']);
        });
    }

    public function test_http_client_creates_deal_without_real_network(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/deals' => Http::response([
                'id' => '67890',
            ], 201),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $dealId = $client->createDeal([
            'dealname' => 'Loaves 4 Joy - 3 loaves',
            'amount' => 25,
            'deal_currency_code' => 'USD',
            'h4j_donation_attempt_id' => 'h4j_attempt_demo_test_0001',
        ]);

        $this->assertSame('67890', $dealId);
        Http::assertSent(function ($request): bool {
            return $request->method() === 'POST'
                && $request->url() === 'https://api.hubapi.com/crm/v3/objects/deals'
                && $request['properties']['h4j_donation_attempt_id'] === 'h4j_attempt_demo_test_0001';
        });
    }

    public function test_http_client_associates_deal_to_contact_without_real_network(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/deals/67890/associations/contacts/12345/3' => Http::response(null, 204),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $client->associateDealToContact('67890', '12345');

        Http::assertSent(function ($request): bool {
            return $request->method() === 'PUT'
                && $request->url() === 'https://api.hubapi.com/crm/v3/objects/deals/67890/associations/contacts/12345/3';
        });
    }

    public function test_http_client_adds_contact_to_list_without_real_network(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/lists/2026-03/9/memberships/add' => Http::response([
                'recordIdsMissing' => [],
                'recordIdsRemoved' => [],
                'recordsIdsAdded' => ['12345'],
            ]),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $result = $client->addContactToList('12345', '9');

        $this->assertSame(['ok' => true, 'error' => null], $result);
        Http::assertSent(function ($request): bool {
            return $request->method() === 'PUT'
                && $request->url() === 'https://api.hubapi.com/crm/lists/2026-03/9/memberships/add'
                && $request->data() === ['12345'];
        });
    }

    public function test_http_client_returns_safe_error_when_list_enrollment_fails(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/lists/2026-03/9/memberships/add' => Http::response([
                'message' => 'This app does not have permission to add records to this list.',
            ], 403),
        ]);

        $client = new HttpHubSpotClient('pat-test-token');

        $result = $client->addContactToList('12345', '9');

        $this->assertSame([
            'ok' => false,
            'error' => 'HubSpot list enrollment failed with status 403.',
        ], $result);
    }

    public function test_http_client_throws_safe_error_when_contact_response_has_no_id(): void
    {
        Http::preventStrayRequests();
        Http::fake([
            'https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert' => Http::response(['results' => []]),
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('HubSpot contact upsert did not return an id.');

        (new HttpHubSpotClient('pat-test-token'))->upsertContact('jordan.helper@example.test', 'Jordan', 'Helper');
    }
}
