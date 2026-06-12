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

Prerequisites for live data:

```bash
cd middleware-api
php artisan migrate
php artisan checkout:replay-fixtures
php artisan serve
```

Then run the dashboard dev server in another terminal.

Not included yet:

- Authentication
- Manual CRM retry actions (#39)
- Deep HubSpot-specific views (#38)

## Stack

- Vite
- React + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`

## Data boundary

Mock donor emails use `@example.test` addresses from the checkout fixtures. No payment or secret fields are rendered.
