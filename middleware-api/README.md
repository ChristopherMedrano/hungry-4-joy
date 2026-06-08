# Hungry-4-Joy Middleware/API

This directory contains the Laravel middleware/API foundation for the Hungry-4-Joy integration layer.

The middleware/API app is separate from the WordPress project-owned files under `wordpress/`. This slice establishes the Laravel app, local setup commands, a minimal API health endpoint, and the first checkout event receiver route.

## Local Setup

Use PHP 8.4 or newer for local middleware work. The lockfile currently includes Laravel/Symfony packages that require PHP 8.4.

Install dependencies:

```bash
cd middleware-api
composer install
```

Create local environment config if `.env` is missing:

```bash
if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
fi
```

Run local middleware migrations:

```bash
php artisan migrate
```

Start the local Laravel server:

```bash
php artisan serve
```

Use the URL printed by Artisan. If another local service already uses port `8000`, Laravel may choose the next available port, such as `8001`.

The local API health endpoint is available at:

```text
http://127.0.0.1:<printed-port>/api/health
```

Expected response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "ok"
}
```

The checkout event receiver route is available at:

```text
POST http://127.0.0.1:<printed-port>/api/checkout/events
```

Valid receiver response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "accepted"
}
```

The receiver validates the safe checkout event contract before acknowledging the request. Invalid payloads receive Laravel's JSON validation response with `422 Unprocessable Content`.

Duplicate receiver response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "duplicate_ignored"
}
```

Current validation covers:

- Required event envelope fields.
- Required opaque `donation_attempt_id`.
- Supported event types: `donation.created` and `payment.failed`.
- Supported provider: `foxy`.
- Campaign and donation fields.
- Safe donor/contact fields.
- Failed payment failure details.
- Obvious forbidden payment or secret fields such as `card_number`, `cvv`, `api_key`, `access_token`, `client_secret`, `payment_method_secret`, and `raw_payment`.

Current storage covers:

- One safe normalized `checkout_events` row per new event.
- Unique `event_id` and `idempotency_key` checks to ignore duplicate sends.
- Canonical `donation_attempt_id` for attempt-level reconciliation.
- Safe campaign, donation, donor/contact, transaction, and redacted failure fields.

## Verification

Run the Laravel test suite:

```bash
php artisan test
```

Run only the fixture-based receiver tests:

```bash
php artisan test --filter=CheckoutEventFixtureReceiverTest
```

Replay the tracked Foxy-shaped checkout event fixtures through the receiver route:

```bash
php artisan checkout:replay-fixtures
```

The dedicated Foxy JSON webhook receiver is:

```text
POST /api/foxy/webhooks
```

Set `FOXY_WEBHOOK_ENCRYPTION_KEY` before enabling the Foxy webhook. The route verifies `Foxy-Webhook-Signature` before adapting safe transaction fields into the normalized checkout event table.

Foxy item options should include `donation_attempt_id`. The webhook adapter preserves that option first and only falls back to `h4j_attempt_foxy_transaction_<transaction-id>` for older or manual payloads that lack the option.

## HubSpot CRM Boundary

HubSpot is disabled by default. The Laravel container binds `App\Contracts\HubSpotClient` to the fake client unless both of these are true:

- `HUBSPOT_ENABLED=true`
- `HUBSPOT_ACCESS_TOKEN` is set

Safe local defaults:

```dotenv
HUBSPOT_ENABLED=false
HUBSPOT_ACCESS_TOKEN=
HUBSPOT_NEWSLETTER_LIST_ID=9
```

With the default config, tests and local development do not make HubSpot network calls. The fake client records calls in memory and returns deterministic fake contact/deal IDs so later sync work can be tested without credentials.

Donor matching for the MVP is email-only. The syncer calls `HubSpotClient::upsertContact()` with donor email, first name, last name, and optional phone; HubSpot handles whether that upsert updates an existing contact or creates a new one. The middleware does not do fuzzy matching or store HubSpot contact ids locally until durable sync status work in #32.

Issue #30 models HubSpot sync as a Laravel job, but the MVP can run it on `QUEUE_CONNECTION=sync` so Render free-tier deployments do not need a separate always-on worker. The job is dispatched only for newly accepted completed donation events. Durable sync status, retries, and duplicate-safe replay after partial failures are deferred to #32.

Live HubSpot testing is optional and should only be done with a private local `.env` token that is never committed. The practice portal currently expects Contacts and Deals to be writable, and the static list "Newsletter subscribers" to use id `9`.

Before live Deal sync, create these custom Deal properties in HubSpot:

- `h4j_donation_attempt_id`
- `h4j_campaign_id`
- `h4j_campaign_name`
- `h4j_donation_label`
- `h4j_donation_type`
- `h4j_checkout_provider`
- `h4j_transaction_id`
- `h4j_checkout_session_id`
- `h4j_source_page`
- `h4j_checkout_event_id`

This middleware does not create HubSpot custom properties for the MVP. If list enrollment fails because the portal or free tier blocks API membership writes, the client returns a safe error message instead of silently ignoring the failure.

Optional manual smoke test, with a real local token only:

```bash
HUBSPOT_ENABLED=true
HUBSPOT_ACCESS_TOKEN=pat-local-only php artisan tinker
```

Then resolve `App\Contracts\HubSpotClient`, upsert an `@example.test` contact, create one Deal with `h4j_donation_attempt_id=h4j_attempt_demo_test_0001`, associate the Deal to the Contact, and try adding the Contact to `HUBSPOT_NEWSLETTER_LIST_ID`.

For the full local receiver walkthrough, including manual fixture submission, validation-error checks, duplicate replay checks, storage inspection, and payment-safety scans, see:

```text
../docs/middleware-receiver-verification.md
```

Confirm the API route exists:

```bash
php artisan route:list --path=api
```

## Current Boundary

Current receiver work adds safe event storage, duplicate prevention, and signed Foxy JSON webhook intake. It does not add CRM sync, analytics, dashboard views, or hosted checkout writes.

Run migrations when setting up local middleware storage. CRM sync, analytics, and dashboard behavior are planned for later middleware/API issues.

Keep `.env` local and uncommitted. Use `.env.example` for safe local placeholders only.
