<?php

namespace Tests\Unit;

use App\Contracts\HubSpotClient;
use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use App\Services\HubSpot\FakeHubSpotClient;
use App\Services\HubSpot\HubSpotDonationSyncer;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
                'method' => 'addContactToList',
                'contactId' => 'fake_contact_jordan_helper_example_test',
                'listId' => '9',
            ],
        ], $fake->calls());
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

    public function test_deal_properties_exclude_idempotency_key(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        app(HubSpotDonationSyncer::class)->sync($this->checkoutEvent());

        $dealCall = $fake->calls()[1];

        $this->assertSame('createDeal', $dealCall['method']);
        $this->assertArrayNotHasKey('idempotency_key', $dealCall['properties']);
    }

    public function test_sync_job_executes_syncer_for_stored_checkout_event(): void
    {
        $fake = new FakeHubSpotClient(enabled: true);
        $this->app->instance(HubSpotClient::class, $fake);

        $event = $this->checkoutEvent();

        (new SyncDonationToHubSpot($event->id))->handle(app(HubSpotDonationSyncer::class));

        $this->assertCount(4, $fake->calls());
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
