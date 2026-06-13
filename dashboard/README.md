# Hungry-4-Joy Status Dashboard

Vite + React + Tailwind shell for the practice nonprofit integration status dashboard.

This app is the frontend half of MVP 5. Laravel remains the API backend; this directory owns the support UI only.

## Local run

```bash
cd dashboard
npm install
npm run dev
```

Open the URL Vite prints (default `http://127.0.0.1:5173`).

Use **View mode → Seeded** in the dashboard to browse all transaction and CRM badge states without running the API seeder.

### Hosted API data

```bash
npm run dev:hosted
```

Proxies `/api` to the Render middleware service instead of local Laravel.

### Hosted dashboard (Render)

After Blueprint sync, the practice dashboard is available at:

```text
https://hungry-4-joy-dashboard.onrender.com
```

That service builds this app and proxies `/api` to the hosted middleware. See [`docs/render-deployment.md`](../docs/render-deployment.md).

## Checks

```bash
npm run lint
npm run build
```

From the repo root:

```bash
npm run dev:dashboard
npm run build:dashboard
```

## Current scope

Issue #37 checkout event views:

- List and detail panels load from Laravel `/api/dashboard/events`
- Filters are sent to the API as query parameters
- Vite proxies `/api` to `http://127.0.0.1:8000` during local development

Issue #38 HubSpot CRM sync views:

- CRM status badges in the event list (Synced, Warning, Pending, Failed, Retryable, N/A)
- Dedicated HubSpot CRM sync section in the detail panel
- State callouts for pending, success, warning, failed, and retryable sync
- Safe HubSpot contact/deal references, error codes, and redacted error messages
- `last_attempted_at`, retry count, and next retry timestamps in detail

Issue #39 CRM sync retry actions:

- Manual retry button for retryable, failed, and list-warning states (Live API mode)
- Disabled retry with explanation for synced, pending, and not-applicable states
- Duplicate-click prevention via loading state; list and detail refresh after retry

Prerequisites for live data:

```bash
cd middleware-api
php artisan migrate
php artisan dashboard:seed-status-demo
php artisan serve
```

The status demo seeder loads one row for every CRM and Foxy badge state. To also include the original checkout contract fixtures:

```bash
php artisan checkout:replay-fixtures
```

Then run the dashboard dev server in another terminal.

### CRM sync verification checklist

After replaying fixtures, inspect these rows in the dashboard:

| Scenario | How to produce | Expected CRM badge | Detail callout |
| --- | --- | --- | --- |
| Synced | Replay `donation-created.one-time.json` | Synced | Green "Synced to HubSpot" with contact/deal ids |
| Not applicable | Replay `payment-failed.one-time.json` | N/A | Gray "CRM sync not applicable" |
| Pending checkout | Replay `checkout-pending.one-time.json` | N/A | Gray not-applicable callout |
| Retryable | Mutate attempt to `retryable` (see API test) | Retryable | Orange retryable failure callout |
| Retry action | Live API → retryable row → Retry sync now | Synced (after success) | Button disabled while request is in flight |
| Failed | Mutate attempt to `failed` with `hubspot_terminal_error` | Failed | Red CRM sync failed callout |
| Warning | Mutate attempt to `succeeded` + `hubspot_list_warning` | Warning | Amber synced-with-warning callout |

Run the dashboard API tests:

```bash
cd middleware-api
php artisan test --filter=Dashboard
```

Not included yet:

- Authentication
- Dashboard fixture walkthrough doc (#40)

## Stack

- Vite
- React + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`

## Data boundary

Mock donor emails use `@example.test` addresses from the checkout fixtures. No payment or secret fields are rendered.
