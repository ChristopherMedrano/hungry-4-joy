# HubSpot Sync Job Design

## Context

Issue #30 adds the Laravel-side job path that turns a stored safe checkout event into HubSpot CRM actions. Issue #29 already added the `HubSpotClient` boundary with fake and HTTP implementations. Issues #31 and #32 remain open and own broader donor matching and durable sync status tracking.

The project is limited to Render free-tier resources for the MVP. Render free web services are not a reliable place for a separate always-on queue worker, and Render cron jobs/background workers are separate service types. For #30, the queue boundary should be modeled with a Laravel job that can run on the `sync` connection locally and on Render free tier.

## Goal

Create a narrow HubSpot donation sync job path that proves stored donation events can feed the HubSpot boundary without requiring production HubSpot writes or a paid worker.

## Non-Goals

- No `crm_sync_attempts` table or durable sync lifecycle state.
- No retry scheduler, retry counters, or persisted succeeded/failed/retryable statuses.
- No temporary secondary dedupe by `donation_attempt_id`.
- No HubSpot-side lookup to prevent duplicate Deals.
- No separate donor matching service beyond the existing `HubSpotClient::upsertContact()` email rule.
- No dashboard, analytics, alerting, email automation, or Render worker service changes.

## Architecture

Add a `SyncDonationToHubSpot` Laravel job that accepts a `checkout_event_id` and loads the stored `CheckoutEvent`. The job no-ops unless the event is eligible: `event_type=donation.created`, `transaction_status=completed`, valid `donation_attempt_id`, and donor email present.

Add a focused `HubSpotDonationSyncer` service that maps one eligible `CheckoutEvent` into Section 4 HubSpot calls:

1. Upsert Contact by donor email.
2. Create one Deal for that stored checkout event.
3. Associate the Deal to the Contact.
4. Add the Contact to the configured newsletter list.

`CheckoutEventIngestor` should return the newly created `CheckoutEvent` model when it accepts a new row, and return `null` for duplicates. The API and Foxy routes should dispatch `SyncDonationToHubSpot` only when the ingestor created a new eligible row. With `QUEUE_CONNECTION=sync`, this runs inline on Render free tier; with another connection, it remains a normal Laravel queued job.

## Data Flow

WordPress click generates `donation_attempt_id` and appends it to the Foxy cart URL. Foxy sends a signed transaction webhook. Laravel verifies and adapts the Foxy payload, stores a normalized `checkout_events` row, then dispatches the HubSpot sync job only for newly accepted completed donations.

The job reads only the stored `CheckoutEvent` row. It must not read raw Foxy payloads, idempotency keys, authorization headers, access tokens, client secrets, payment details, or private donor notes.

## HubSpot Payload Mapping

Contact:

- `donor_email` -> `email`
- `donor_first_name` -> `firstname`
- `donor_last_name` -> `lastname`
- `donor_phone` -> `phone` when present

Deal properties:

- `donation_attempt_id` -> `h4j_donation_attempt_id`
- `campaign_name` + `donation_label` -> `dealname`
- `donation_amount` -> `amount`
- `donation_currency` -> `deal_currency_code`
- `campaign_id` -> `h4j_campaign_id`
- `campaign_name` -> `h4j_campaign_name`
- `donation_label` -> `h4j_donation_label`
- `donation_type` -> `h4j_donation_type`
- `checkout_provider` -> `h4j_checkout_provider`
- `transaction_id` -> `h4j_transaction_id`
- `checkout_session_id` -> `h4j_checkout_session_id`
- `source_page` -> `h4j_source_page`
- `event_id` -> `h4j_checkout_event_id`
- `event_created_at` -> `closedate`

Follow-up:

- `services.hubspot.newsletter_list_id` -> `addContactToList($contactId, $listId)`

`idempotency_key` is intentionally excluded from all CRM payloads.

## Dedupe Scope

Issue #30 keeps dedupe simple:

- Existing ingest dedupe prevents duplicate `event_id` or `idempotency_key` rows.
- Routes dispatch the sync job only when a new row is accepted.
- Duplicate receiver replay returns `duplicate_ignored` and does not dispatch another job.

Durable sync dedupe, retry lifecycle, persisted HubSpot ids, and crash recovery are intentionally deferred to #32.

## Failure Behavior

The job may throw safe exceptions from `HubSpotClient` for now. Laravel can surface those through the current queue behavior. Durable failure records are deferred to #32.

List enrollment remains best effort because #29’s client returns `['ok' => false, 'error' => ...]` when list writes are blocked. In #30, a list failure should not prevent Contact, Deal, and association calls from succeeding.

## Testing

Tests should verify:

- Eligible new checkout events dispatch `SyncDonationToHubSpot`.
- Duplicate checkout event replay does not dispatch another job.
- Failed payment events do not dispatch HubSpot sync.
- The job no-ops for ineligible stored events.
- The job calls `HubSpotClient` through fake/local behavior and records Contact, Deal, association, and list calls.
- Deal properties include `h4j_donation_attempt_id` and exclude `idempotency_key`.
- Fixture-based donation events can feed the path without live HubSpot credentials.

## Open Concern

Without `crm_sync_attempts`, a crash after HubSpot Deal creation but before route completion could still lead to duplicate Deals on manual rerun. This is acceptable for #30 because #32 owns durable sync lifecycle and retry-safe dedupe.
