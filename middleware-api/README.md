# Hungry-4-Joy Middleware/API

This directory contains the Laravel middleware/API foundation for the Hungry-4-Joy integration layer.

The middleware/API app is separate from the WordPress project-owned files under `wordpress/`. This slice establishes the Laravel app, local setup commands, a minimal API health endpoint, and the first checkout event receiver route.

## Local Setup

Install dependencies:

```bash
cd middleware-api
composer install
```

Create local environment config:

```bash
cp .env.example .env
php artisan key:generate
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

Current validation covers:

- Required event envelope fields.
- Supported event types: `donation.created` and `payment.failed`.
- Supported provider: `foxy`.
- Campaign and donation fields.
- Safe donor/contact fields.
- Failed payment failure details.
- Obvious forbidden payment or secret fields such as `card_number`, `cvv`, `api_key`, `access_token`, `client_secret`, `payment_method_secret`, and `raw_payment`.

## Verification

Run the Laravel test suite:

```bash
php artisan test
```

Confirm the API route exists:

```bash
php artisan route:list --path=api
```

## Current Boundary

Issue #23 adds checkout event payload validation. It does not add signature validation, event persistence, duplicate prevention, CRM sync, analytics, dashboard views, hosted checkout writes, or production deployment configuration.

Do not run migrations as part of this issue. Checkout event validation, persistence, and duplicate prevention are planned for later middleware/API issues.

Keep `.env` local and uncommitted. Use `.env.example` for safe local placeholders only.
