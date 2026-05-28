# Hungry-4-Joy Middleware/API

This directory contains the Laravel middleware/API foundation for the Hungry-4-Joy integration layer.

The middleware/API app is separate from the WordPress project-owned files under `wordpress/`. This slice establishes the Laravel app, local setup commands, a minimal API health endpoint, and the first checkout event receiver route.

## Local Setup

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
- Supported event types: `donation.created` and `payment.failed`.
- Supported provider: `foxy`.
- Campaign and donation fields.
- Safe donor/contact fields.
- Failed payment failure details.
- Obvious forbidden payment or secret fields such as `card_number`, `cvv`, `api_key`, `access_token`, `client_secret`, `payment_method_secret`, and `raw_payment`.

Current storage covers:

- One safe normalized `checkout_events` row per new event.
- Unique `event_id` and `idempotency_key` checks to ignore duplicate sends.
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

For the full local receiver walkthrough, including manual fixture submission, validation-error checks, duplicate replay checks, storage inspection, and payment-safety scans, see:

```text
../docs/middleware-receiver-verification.md
```

Confirm the API route exists:

```bash
php artisan route:list --path=api
```

## Current Boundary

Current receiver work adds safe event storage and duplicate prevention. It does not add signature validation, CRM sync, analytics, dashboard views, hosted checkout writes, or production deployment configuration.

Run migrations when setting up local middleware storage. CRM sync, analytics, and dashboard behavior are planned for later middleware/API issues.

Keep `.env` local and uncommitted. Use `.env.example` for safe local placeholders only.
