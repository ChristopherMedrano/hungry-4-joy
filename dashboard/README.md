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

### Hosted API data

```bash
npm run dev:hosted
```

Proxies `/api` to the Render middleware service instead of local Laravel.

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

Prerequisites for live data:

```bash
cd middleware-api
php artisan migrate
php artisan checkout:replay-fixtures
php artisan serve
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
| Failed | Mutate attempt to `failed` with `hubspot_terminal_error` | Failed | Red CRM sync failed callout |
| Warning | Mutate attempt to `succeeded` + `hubspot_list_warning` | Warning | Amber synced-with-warning callout |

Run the dashboard API tests:

```bash
cd middleware-api
php artisan test --filter=DashboardEvent
```

Not included yet:

- Authentication
- Manual CRM retry actions (#39)
- Dashboard fixture walkthrough doc (#40)

## Stack

- Vite
- React + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`

## Data boundary

Mock donor emails use `@example.test` addresses from the checkout fixtures. No payment or secret fields are rendered.
