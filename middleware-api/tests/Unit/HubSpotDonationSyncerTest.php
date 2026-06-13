<?php

namespace Tests\Unit;

use App\Contracts\HubSpotClient;
use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HubSpotDonationSyncer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class HubSpotDonationSyncerTest extends TestCase
{
    use RefreshDatabase;

    public function test_syncer_maps_stored_checkout_event_to_hubspot_calls(): void
    {
        config(['services.hubspot.newsletter_list_id' => '9']);
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = $this->checkoutEvent();

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $this->assertSame('synced', $result['status']);
        $this->assertSame('fake_contact_jordan_helper_example_test', $result['contact_id']);
        $this->assertSame('fake_deal_1', $result['deal_id']);
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
                    'h4j_donation_attempt_id' => 'h4j_attempt_demo_loaves_0001',
                    'dealname' => 'Loaves 4 Joy - 3 loaves',
                    'amount' => 25.0,
                    'deal_currency_code' => 'USD',
                    'h4j_campaign_id' => 'loaves-campaign-01',
                    'h4j_campaign_name' => 'Loaves 4 Joy',
                    'h4j_donation_label' => '3 loaves',
                    'h4j_donation_type' => 'one_time',
                    'h4j_checkout_provider' => 'foxy',
                    'h4j_transaction_id' => 'txn_demo_loaves_1042',
                    'h4j_checkout_session_id' => 'sess_demo_loaves_0001',
                    'h4j_source_page' => 'home',
                    'h4j_checkout_event_id' => 'evt_h4j_demo_20260527_0001',
                    'closedate' => '2026-05-27T14:05:00+00:00',
                ],
            ],
            [
                'method' => 'associateDealToContact',
                'dealId' => 'fake_deal_1',
                'contactId' => 'fake_contact_jordan_helper_example_test',
            ],
            [
                'method' => 'getDealDonationAttemptId',
                'dealId' => 'fake_deal_1',
            ],
            [
                'method' => 'addContactToList',
                'contactId' => 'fake_contact_jordan_helper_example_test',
                'listId' => '9',
            ],
        ], $fake->calls());
    }

    public function test_successful_sync_stores_succeeded_attempt_with_hubspot_references(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = $this->checkoutEvent();

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $this->assertSame('synced', $result['status']);
        $this->assertSame('succeeded', $attempt->status);
        $this->assertSame('fake_contact_jordan_helper_example_test', $attempt->hubspot_contact_id);
        $this->assertSame('fake_deal_1', $attempt->hubspot_deal_id);
        $this->assertSame('h4j_attempt_demo_loaves_0001', $attempt->hubspot_donation_attempt_id);
        $this->assertNull($attempt->error_code);
        $this->assertNull($attempt->error_message);
        $this->assertSame(0, $attempt->retry_count);
        $this->assertNotNull($attempt->last_attempted_at);
        $this->assertNull($attempt->next_retry_at);
    }

    public function test_successfully_synced_event_is_not_processed_again(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        CrmSyncAttempt::create([
            'checkout_event_id' => $event->id,
            'status' => 'succeeded',
            'hubspot_contact_id' => 'contact_existing_123',
            'hubspot_deal_id' => 'deal_existing_456',
            'last_attempted_at' => now(),
        ]);

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $this->assertSame([
            'status' => 'already_synced',
            'contact_id' => 'contact_existing_123',
            'deal_id' => 'deal_existing_456',
        ], $result);
        $this->assertSame([], $fake->calls());
    }

    public function test_retryable_hubspot_failure_is_stored_safely_without_throwing(): void
    {
        $fake = new FailingHubSpotClient('HubSpot deal creation failed with status 429.');
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $this->assertSame('retryable', $result['status']);
        $this->assertSame('retryable', $attempt->status);
        $this->assertSame('hubspot_retryable_error', $attempt->error_code);
        $this->assertSame('HubSpot deal creation failed with status 429.', $attempt->error_message);
        $this->assertSame(1, $attempt->retry_count);
        $this->assertNotNull($attempt->last_attempted_at);
        $this->assertNotNull($attempt->next_retry_at);
        $this->assertNull($attempt->hubspot_contact_id);
        $this->assertNull($attempt->hubspot_deal_id);
    }

    public function test_repeated_retryable_failures_increment_retry_count_and_redact_token_like_values(): void
    {
        $fake = new FailingHubSpotClient(
            'HubSpot deal creation failed with status 503. Bearer super-secret-token pat-demo-secret'
        );
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        app(HubSpotDonationSyncer::class)->sync($event);
        app(HubSpotDonationSyncer::class)->sync($event);

        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $this->assertSame('retryable', $attempt->status);
        $this->assertSame(2, $attempt->retry_count);
        $this->assertStringContainsString('Bearer [redacted]', $attempt->error_message);
        $this->assertStringContainsString('pat-[redacted]', $attempt->error_message);
        $this->assertStringNotContainsString('super-secret-token', $attempt->error_message);
        $this->assertStringNotContainsString('pat-demo-secret', $attempt->error_message);
    }

    public function test_terminal_hubspot_failure_is_stored_safely_without_retry_time(): void
    {
        $fake = new FailingHubSpotClient('HubSpot contact upsert did not return an id.');
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $this->assertSame('failed', $result['status']);
        $this->assertSame('failed', $attempt->status);
        $this->assertSame('hubspot_terminal_error', $attempt->error_code);
        $this->assertSame('HubSpot contact upsert did not return an id.', $attempt->error_message);
        $this->assertSame(1, $attempt->retry_count);
        $this->assertNotNull($attempt->last_attempted_at);
        $this->assertNull($attempt->next_retry_at);
    }

    public function test_list_enrollment_failure_stores_safe_warning_on_succeeded_attempt(): void
    {
        $fake = new ListFailingHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $this->assertSame('synced', $result['status']);
        $this->assertSame('succeeded', $attempt->status);
        $this->assertSame('hubspot_list_warning', $attempt->error_code);
        $this->assertSame('HubSpot list enrollment failed with status 403.', $attempt->error_message);
        $this->assertSame('fake_contact_jordan_helper_example_test', $attempt->hubspot_contact_id);
        $this->assertSame('fake_deal_1', $attempt->hubspot_deal_id);
        $this->assertSame(0, $attempt->retry_count);
    }

    public function test_syncer_retries_list_enrollment_after_prior_list_warning(): void
    {
        $fake = new ListFailingHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);
        $event = $this->checkoutEvent();

        app(HubSpotDonationSyncer::class)->sync($event);

        $fake->setListEnrollmentResult(['ok' => true, 'error' => null]);

        $result = app(HubSpotDonationSyncer::class)->sync($event);
        $attempt = $event->crmSyncAttempt()->firstOrFail();
        $attempt->refresh();

        $this->assertSame('list_enrolled', $result['status']);
        $this->assertSame('succeeded', $attempt->status);
        $this->assertNull($attempt->error_code);
        $this->assertNull($attempt->error_message);
        $this->assertSame(2, count(array_filter(
            $fake->calls(),
            fn (array $call): bool => $call['method'] === 'addContactToList'
        )));
    }

    public function test_syncer_delegates_contact_matching_to_email_upsert_once(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        app(HubSpotDonationSyncer::class)->sync($this->checkoutEvent());

        $upsertCalls = array_values(array_filter(
            $fake->calls(),
            fn (array $call): bool => $call['method'] === 'upsertContact'
        ));

        $this->assertSame([
            [
                'method' => 'upsertContact',
                'email' => 'jordan.helper@example.test',
                'firstname' => 'Jordan',
                'lastname' => 'Helper',
                'phone' => '555-0104',
            ],
        ], $upsertCalls);
    }

    public function test_syncer_skips_ineligible_events(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = $this->checkoutEvent(['event_type' => 'payment.failed', 'transaction_status' => 'failed']);

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $this->assertSame(['status' => 'skipped_ineligible'], $result);
        $this->assertSame([], $fake->calls());
    }

    public function test_syncer_skips_stored_event_without_donor_email(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = CheckoutEvent::make([
            'event_type' => 'donation.created',
            'transaction_status' => 'completed',
            'donation_attempt_id' => 'h4j_attempt_demo_loaves_0001',
            'donor_email' => null,
        ]);

        $result = app(HubSpotDonationSyncer::class)->sync($event);

        $this->assertSame(['status' => 'skipped_ineligible'], $result);
        $this->assertSame([], $fake->calls());
    }

    public function test_crm_payloads_exclude_sensitive_and_ingest_only_fields(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        app(HubSpotDonationSyncer::class)->sync($this->checkoutEvent([
            'idempotency_key' => 'evt_h4j_demo_20260527_0001',
            'failure_code' => 'card_declined',
            'failure_message' => 'Do not send this failure detail',
            'failure_provider_status' => '402',
        ]));

        $contactCall = $fake->calls()[0];
        $dealCall = $fake->calls()[1];

        $this->assertSame('upsertContact', $contactCall['method']);
        $this->assertArrayNotHasKey('idempotency_key', $contactCall);
        $this->assertArrayNotHasKey('failure_message', $contactCall);

        $this->assertSame('createDeal', $dealCall['method']);
        $this->assertArrayNotHasKey('idempotency_key', $dealCall['properties']);
        $this->assertArrayNotHasKey('failure_code', $dealCall['properties']);
        $this->assertArrayNotHasKey('failure_message', $dealCall['properties']);
        $this->assertArrayNotHasKey('failure_provider_status', $dealCall['properties']);
    }

    public function test_sync_job_executes_syncer_for_stored_checkout_event(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = $this->checkoutEvent();

        (new SyncDonationToHubSpot($event->id))->handle(app(HubSpotDonationSyncer::class));

        $this->assertCount(5, $fake->calls());
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function checkoutEvent(array $overrides = []): CheckoutEvent
    {
        return CheckoutEvent::create(array_merge([
            'event_id' => 'evt_h4j_demo_20260527_0001',
            'event_type' => 'donation.created',
            'event_created_at' => '2026-05-27T14:05:00Z',
            'donation_attempt_id' => 'h4j_attempt_demo_loaves_0001',
            'checkout_provider' => 'foxy',
            'checkout_session_id' => 'sess_demo_loaves_0001',
            'transaction_id' => 'txn_demo_loaves_1042',
            'transaction_status' => 'completed',
            'idempotency_key' => 'evt_h4j_demo_20260527_0001',
            'source_page' => 'home',
            'campaign_id' => 'loaves-campaign-01',
            'campaign_name' => 'Loaves 4 Joy',
            'donation_amount' => 25,
            'donation_currency' => 'USD',
            'donation_label' => '3 loaves',
            'donation_type' => 'one_time',
            'donor_email' => 'jordan.helper@example.test',
            'donor_first_name' => 'Jordan',
            'donor_last_name' => 'Helper',
            'donor_phone' => '555-0104',
        ], $overrides));
    }
}

class FailingHubSpotClient extends FakeHubSpotClient
{
    public function __construct(private readonly string $message)
    {
        parent::__construct(enabled: true);
    }

    public function createDeal(array $properties): string
    {
        throw new RuntimeException($this->message);
    }
}

class ListFailingHubSpotClient extends FakeHubSpotClient
{
    /**
     * @var array{ok: bool, error: string|null}
     */
    private array $listResult = [
        'ok' => false,
        'error' => 'HubSpot list enrollment failed with status 403.',
    ];

    /**
     * @param  array{ok: bool, error: string|null}  $listResult
     */
    public function setListEnrollmentResult(array $listResult): void
    {
        $this->listResult = $listResult;
    }

    public function addContactToList(string $contactId, string $listId): array
    {
        parent::addContactToList($contactId, $listId);

        return $this->listResult;
    }
}
