# HubSpot Sync Job Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a narrow Laravel job path that syncs newly accepted completed donation events to HubSpot through the #29 client boundary.

**Architecture:** `CheckoutEventIngestor` returns the newly stored model for accepted rows and `null` for duplicates. API/Foxy routes dispatch `SyncDonationToHubSpot` only for newly accepted eligible rows; on Render free tier this can run on the existing `sync` queue connection. `HubSpotDonationSyncer` maps one stored `CheckoutEvent` to HubSpot Contact, Deal, association, and newsletter-list calls, with durable sync status deferred to #32.

**Tech Stack:** Laravel 13, PHP 8.4, Laravel jobs/bus, Laravel queue sync driver, PHPUnit.

---

## Scope

Implement GitHub issue #30 only.

In scope:

- Create `SyncDonationToHubSpot` job.
- Create `HubSpotDonationSyncer` service.
- Add `CheckoutEvent::hubSpotSyncEligible()`.
- Update `CheckoutEventIngestor::ingest()` to expose the created model for dispatch.
- Dispatch the sync job from `/api/checkout/events` and `/api/foxy/webhooks` only when a new eligible row is accepted.
- Add tests proving fixture donation events feed the job path with no live HubSpot credentials.

Out of scope:

- No `crm_sync_attempts`.
- No durable succeeded/failed/retryable state.
- No temporary `donation_attempt_id` dedupe.
- No HubSpot-side duplicate Deal lookup.
- No separate donor matching service.
- No queue worker or Render background worker changes.
- No dashboard, analytics, alerting, or email automation.

## File Structure

- Create `middleware-api/app/Jobs/SyncDonationToHubSpot.php`
  - Queueable job that accepts `checkout_event_id`, loads `CheckoutEvent`, and delegates to `HubSpotDonationSyncer`.
- Create `middleware-api/app/Services/HubSpot/HubSpotDonationSyncer.php`
  - Maps eligible stored checkout events to HubSpot client calls.
- Modify `middleware-api/app/Models/CheckoutEvent.php`
  - Adds `hubSpotSyncEligible()`.
- Modify `middleware-api/app/Services/CheckoutEventIngestor.php`
  - Returns the created `CheckoutEvent` for accepted rows; returns `null` for duplicates.
- Modify `middleware-api/routes/api.php`
  - Dispatches the job after accepted eligible rows.
- Create `middleware-api/tests/Feature/HubSpotSyncDispatchTest.php`
  - Proves routes dispatch once for eligible donations and not for duplicates/failed payments.
- Create `middleware-api/tests/Unit/HubSpotDonationSyncerTest.php`
  - Proves mapping and fake client calls from stored safe data.
- Modify `middleware-api/tests/Feature/CheckoutEventReceiverRouteTest.php`
  - Adjusts direct ingestor-result assertion for the new return shape.
- Modify `middleware-api/README.md`
  - Documents the free-tier sync-job behavior and #32 dedupe/status deferral.

## Tasks

### Task 1: Model Eligibility and Ingest Result

**Files:**
- Modify: `middleware-api/app/Models/CheckoutEvent.php`
- Modify: `middleware-api/app/Services/CheckoutEventIngestor.php`
- Modify: `middleware-api/tests/Feature/CheckoutEventReceiverRouteTest.php`

- [ ] **Step 1: Add failing tests for eligibility and returned model**

Append these tests to `CheckoutEventReceiverRouteTest` before the helper method:

```php
public function test_checkout_event_model_reports_hubspot_sync_eligibility(): void
{
    $payload = $this->fixture('donation-created.one-time.json');
    app(CheckoutEventIngestor::class)->ingest($payload);

    $event = CheckoutEvent::firstOrFail();

    $this->assertTrue($event->hubSpotSyncEligible());

    $event->forceFill(['transaction_status' => 'failed']);
    $this->assertFalse($event->hubSpotSyncEligible());
}

public function test_checkout_event_ingestor_returns_created_event_for_new_rows_and_null_for_duplicates(): void
{
    $payload = $this->fixture('donation-created.one-time.json');

    $first = app(CheckoutEventIngestor::class)->ingest($payload);
    $second = app(CheckoutEventIngestor::class)->ingest($payload);

    $this->assertSame('accepted', $first['status']);
    $this->assertInstanceOf(CheckoutEvent::class, $first['checkout_event']);
    $this->assertSame('duplicate_ignored', $second['status']);
    $this->assertNull($second['checkout_event']);
}
```

Update the existing `test_checkout_event_ingestor_treats_unique_constraint_collision_as_duplicate_retry()` assertion to:

```php
$this->assertSame('duplicate_ignored', $result['status']);
$this->assertSame(Response::HTTP_OK, $result['code']);
$this->assertNull($result['checkout_event']);
```

- [ ] **Step 2: Run the focused tests and see them fail**

Run:

```bash
cd middleware-api
php artisan test --filter=CheckoutEventReceiverRouteTest
```

Expected: FAIL because `hubSpotSyncEligible()` does not exist and `ingest()` does not return `checkout_event`.

- [ ] **Step 3: Add eligibility and return created model**

Add this method to `CheckoutEvent`:

```php
public function hubSpotSyncEligible(): bool
{
    return $this->event_type === 'donation.created'
        && $this->transaction_status === 'completed'
        && filled($this->donation_attempt_id)
        && filled($this->donor_email);
}
```

In `CheckoutEventIngestor`, change the docblock return type to:

```php
 * @return array{status: string, code: int, checkout_event: CheckoutEvent|null}
```

For duplicate returns, include:

```php
'checkout_event' => null,
```

Assign the created row:

```php
$checkoutEvent = CheckoutEvent::create([
    // existing attributes
]);
```

For accepted returns, include:

```php
'checkout_event' => $checkoutEvent,
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
cd middleware-api
php artisan test --filter=CheckoutEventReceiverRouteTest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware-api/app/Models/CheckoutEvent.php middleware-api/app/Services/CheckoutEventIngestor.php middleware-api/tests/Feature/CheckoutEventReceiverRouteTest.php
git commit -m "feat: expose accepted checkout event for sync"
```

### Task 2: Add HubSpot Donation Syncer

**Files:**
- Create: `middleware-api/app/Services/HubSpot/HubSpotDonationSyncer.php`
- Create: `middleware-api/tests/Unit/HubSpotDonationSyncerTest.php`

- [ ] **Step 1: Add syncer tests**

Create `middleware-api/tests/Unit/HubSpotDonationSyncerTest.php`:

```php
<?php

namespace Tests\Unit;

use App\Contracts\HubSpotClient;
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpotDonationSyncerTest
```

Expected: FAIL because `HubSpotDonationSyncer` does not exist.

- [ ] **Step 3: Add syncer service**

Create `middleware-api/app/Services/HubSpot/HubSpotDonationSyncer.php`:

```php
<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;
use App\Models\CheckoutEvent;

class HubSpotDonationSyncer
{
    public function __construct(private readonly HubSpotClient $hubSpot) {}

    /**
     * @return array<string, mixed>
     */
    public function sync(CheckoutEvent $event): array
    {
        if (! $event->hubSpotSyncEligible()) {
            return ['status' => 'skipped_ineligible'];
        }

        $contactId = $this->hubSpot->upsertContact(
            $event->donor_email,
            $event->donor_first_name,
            $event->donor_last_name,
            $event->donor_phone,
        );

        $dealId = $this->hubSpot->createDeal($this->dealProperties($event));

        $this->hubSpot->associateDealToContact($dealId, $contactId);

        $listResult = $this->hubSpot->addContactToList(
            $contactId,
            (string) config('services.hubspot.newsletter_list_id', '9'),
        );

        return [
            'status' => 'synced',
            'contact_id' => $contactId,
            'deal_id' => $dealId,
            'list_result' => $listResult,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function dealProperties(CheckoutEvent $event): array
    {
        return [
            'h4j_donation_attempt_id' => $event->donation_attempt_id,
            'dealname' => $event->campaign_name.' - '.$event->donation_label,
            'amount' => (float) $event->donation_amount,
            'deal_currency_code' => $event->donation_currency,
            'h4j_campaign_id' => $event->campaign_id,
            'h4j_campaign_name' => $event->campaign_name,
            'h4j_donation_label' => $event->donation_label,
            'h4j_donation_type' => $event->donation_type,
            'h4j_checkout_provider' => $event->checkout_provider,
            'h4j_transaction_id' => $event->transaction_id,
            'h4j_checkout_session_id' => $event->checkout_session_id,
            'h4j_source_page' => $event->source_page,
            'h4j_checkout_event_id' => $event->event_id,
            'closedate' => $event->event_created_at?->toIso8601String(),
        ];
    }
}
```

- [ ] **Step 4: Run syncer tests**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpotDonationSyncerTest
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add middleware-api/app/Services/HubSpot/HubSpotDonationSyncer.php middleware-api/tests/Unit/HubSpotDonationSyncerTest.php
git commit -m "feat: map checkout events to hubspot sync"
```

### Task 3: Add Job and Route Dispatch

**Files:**
- Create: `middleware-api/app/Jobs/SyncDonationToHubSpot.php`
- Modify: `middleware-api/routes/api.php`
- Create: `middleware-api/tests/Feature/HubSpotSyncDispatchTest.php`

- [ ] **Step 1: Add dispatch tests**

Create `middleware-api/tests/Feature/HubSpotSyncDispatchTest.php`:

```php
<?php

namespace Tests\Feature;

use App\Jobs\SyncDonationToHubSpot;
use App\Models\CheckoutEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Tests\TestCase;

class HubSpotSyncDispatchTest extends TestCase
{
    use RefreshDatabase;

    public function test_checkout_receiver_dispatches_hubspot_sync_for_new_completed_donation(): void
    {
        Bus::fake();

        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $event = CheckoutEvent::firstOrFail();

        Bus::assertDispatched(SyncDonationToHubSpot::class, function (SyncDonationToHubSpot $job) use ($event): bool {
            return $job->checkoutEventId === $event->id;
        });
    }

    public function test_duplicate_checkout_replay_does_not_dispatch_second_hubspot_sync(): void
    {
        Bus::fake();
        $payload = $this->fixture('donation-created.one-time.json');

        $this->postJson('/api/checkout/events', $payload)->assertAccepted();
        $this->postJson('/api/checkout/events', $payload)->assertOk();

        Bus::assertDispatchedTimes(SyncDonationToHubSpot::class, 1);
    }

    public function test_failed_payment_does_not_dispatch_hubspot_sync(): void
    {
        Bus::fake();

        $this->postJson('/api/checkout/events', $this->fixture('payment-failed.one-time.json'))
            ->assertAccepted();

        Bus::assertNotDispatched(SyncDonationToHubSpot::class);
    }

    /**
     * @return array<string, mixed>
     */
    private function fixture(string $fileName): array
    {
        return json_decode(
            file_get_contents(base_path('../examples/checkout-events/'.$fileName)),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }
}
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpotSyncDispatchTest
```

Expected: FAIL because `SyncDonationToHubSpot` does not exist and routes do not dispatch it.

- [ ] **Step 3: Add job**

Create `middleware-api/app/Jobs/SyncDonationToHubSpot.php`:

```php
<?php

namespace App\Jobs;

use App\Models\CheckoutEvent;
use App\Services\HubSpot\HubSpotDonationSyncer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncDonationToHubSpot implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $checkoutEventId) {}

    public function handle(HubSpotDonationSyncer $syncer): void
    {
        $event = CheckoutEvent::find($this->checkoutEventId);

        if (! $event instanceof CheckoutEvent) {
            return;
        }

        $syncer->sync($event);
    }
}
```

- [ ] **Step 4: Dispatch from routes**

In `middleware-api/routes/api.php`, add:

```php
use App\Jobs\SyncDonationToHubSpot;
```

After `$checkoutEventResponse`, add:

```php
$dispatchHubSpotSync = function (array $result): void {
    $checkoutEvent = $result['checkout_event'] ?? null;

    if ($checkoutEvent instanceof App\Models\CheckoutEvent && $checkoutEvent->hubSpotSyncEligible()) {
        SyncDonationToHubSpot::dispatch($checkoutEvent->id);
    }
};
```

Call it after each ingest:

```php
$dispatchHubSpotSync($result);
```

before returning the response in both `/api/checkout/events` and `/api/foxy/webhooks`.

- [ ] **Step 5: Run dispatch tests**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpotSyncDispatchTest
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add middleware-api/app/Jobs/SyncDonationToHubSpot.php middleware-api/routes/api.php middleware-api/tests/Feature/HubSpotSyncDispatchTest.php
git commit -m "feat: dispatch hubspot sync for accepted donations"
```

### Task 4: Test Job Execution and Foxy Path

**Files:**
- Modify: `middleware-api/tests/Unit/HubSpotDonationSyncerTest.php`
- Modify: `middleware-api/tests/Feature/FoxyWebhookReceiverRouteTest.php`

- [ ] **Step 1: Add job execution and Foxy dispatch tests**

Append this test to `HubSpotDonationSyncerTest`:

```php
public function test_sync_job_executes_syncer_for_stored_checkout_event(): void
{
    $fake = new FakeHubSpotClient(enabled: true);
    $this->app->instance(HubSpotClient::class, $fake);

    $event = $this->checkoutEvent();

    (new \App\Jobs\SyncDonationToHubSpot($event->id))->handle(app(HubSpotDonationSyncer::class));

    $this->assertCount(4, $fake->calls());
}
```

In `FoxyWebhookReceiverRouteTest`, add `use App\Jobs\SyncDonationToHubSpot;` and `use Illuminate\Support\Facades\Bus;`, then append:

```php
public function test_foxy_webhook_dispatches_hubspot_sync_for_signed_completed_donation(): void
{
    Bus::fake();
    config(['services.foxy.webhook_encryption_key' => self::WEBHOOK_SECRET]);

    $payload = $this->foxyTransactionPayload();

    $this->postJson(
        '/api/foxy/webhooks',
        $payload,
        $this->signedHeaders($payload, 'transaction/created')
    )->assertAccepted();

    Bus::assertDispatched(SyncDonationToHubSpot::class);
}
```

- [ ] **Step 2: Run tests**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpotDonationSyncerTest
php artisan test --filter=FoxyWebhookReceiverRouteTest
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add middleware-api/tests/Unit/HubSpotDonationSyncerTest.php middleware-api/tests/Feature/FoxyWebhookReceiverRouteTest.php
git commit -m "test: cover hubspot sync job execution paths"
```

### Task 5: Document Free-Tier Job Behavior

**Files:**
- Modify: `middleware-api/README.md`

- [ ] **Step 1: Add README note**

Add this paragraph to the HubSpot CRM Boundary section:

```markdown
Issue #30 models HubSpot sync as a Laravel job, but the MVP can run it on `QUEUE_CONNECTION=sync` so Render free-tier deployments do not need a separate always-on worker. The job is dispatched only for newly accepted completed donation events. Durable sync status, retries, and duplicate-safe replay after partial failures are deferred to #32.
```

- [ ] **Step 2: Verify docs mention the free-tier path**

Run:

```bash
cd middleware-api
rg "QUEUE_CONNECTION=sync|deferred to #32|newly accepted completed donation" README.md
```

Expected: all phrases are present.

- [ ] **Step 3: Commit**

```bash
git add middleware-api/README.md
git commit -m "docs: document hubspot sync job behavior"
```

### Task 6: Final Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

Run:

```bash
cd middleware-api
php artisan test --filter=HubSpot
php artisan test --filter=CheckoutEventReceiverRouteTest
php artisan test --filter=FoxyWebhookReceiverRouteTest
```

Expected: PASS.

- [ ] **Step 2: Run full test suite**

Run:

```bash
cd middleware-api
php artisan test
```

Expected: PASS.

- [ ] **Step 3: Run style check on touched PHP files**

Run:

```bash
cd middleware-api
./vendor/bin/pint --test app/Jobs app/Models/CheckoutEvent.php app/Services/CheckoutEventIngestor.php app/Services/HubSpot tests/Feature/CheckoutEventReceiverRouteTest.php tests/Feature/FoxyWebhookReceiverRouteTest.php tests/Feature/HubSpotSyncDispatchTest.php tests/Unit/HubSpotDonationSyncerTest.php
```

Expected: PASS. If only touched files fail, run Pint on those files and commit the formatting correction.

- [ ] **Step 4: Confirm out-of-scope items were not added**

Run:

```bash
rg "crm_sync_attempts|retry_count|next_retry|dashboard|analytics|donation_attempt_id.*where|where\\('donation_attempt_id'" middleware-api/app middleware-api/database middleware-api/tests
```

Expected: no `crm_sync_attempts`, no retry table behavior, no dashboard/analytics code, and no temporary `donation_attempt_id` dedupe query.

- [ ] **Step 5: Review git diff**

Run:

```bash
git status --short
git diff --stat main..HEAD
```

Expected: changes are limited to the spec, plan, sync job, syncer, ingest return shape, routes, tests, and README.

## Self-Review

Spec coverage:

- Job exists or is modeled: Task 3.
- Stored safe event data only: Task 2 tests and syncer implementation.
- Donor, donation, campaign, follow-up data prepared: Task 2.
- Duplicate receiver replay does not enqueue duplicate job: Task 3.
- Failures surface through safe job exceptions for now, durable tracking deferred to #32: Scope and README.
- Render free-tier no-worker constraint: Scope and README.

Placeholder scan:

- No placeholder markers remain.
- Every code-producing task includes concrete code.

Type consistency:

- `checkout_event_id` in docs maps to `checkoutEventId` public job property and `CheckoutEvent::id`.
- `checkout_event` result key consistently carries `CheckoutEvent|null`.
