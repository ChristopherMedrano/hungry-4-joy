# Hungry-4-Joy Middleware/API

This directory contains the Laravel middleware/API foundation for the Hungry-4-Joy integration layer.

The middleware/API app is separate from the WordPress project-owned files under `wordpress/`. This slice only establishes the Laravel app, local setup commands, and a minimal API health endpoint for future checkout event receiver work.

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

Issue #21 does not add checkout receiver behavior, event persistence, CRM sync, analytics, dashboard views, hosted checkout writes, or production deployment configuration.

Do not run migrations as part of this issue. Checkout event validation, persistence, and duplicate prevention are planned for later middleware/API issues.

Keep `.env` local and uncommitted. Use `.env.example` for safe local placeholders only.
