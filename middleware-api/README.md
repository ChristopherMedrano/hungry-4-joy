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

Current receiver response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "accepted"
}
```

The receiver route currently only acknowledges JSON requests with `202 Accepted`. It does not validate event shape, verify signatures, store events, enforce idempotency, sync CRM data, emit analytics, or power dashboard views yet.

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

Issue #22 adds the checkout event receiver route only. It does not add event validation, signature validation, event persistence, duplicate prevention, CRM sync, analytics, dashboard views, hosted checkout writes, or production deployment configuration.

Do not run migrations as part of this issue. Checkout event validation, persistence, and duplicate prevention are planned for later middleware/API issues.

Keep `.env` local and uncommitted. Use `.env.example` for safe local placeholders only.
