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

Issue #36 shell only:

- Base layout, navigation placeholders, filter bar, responsive event table, detail panel
- Empty, loading, and error states (use the **Shell preview** control in the header)
- Fictional mock rows shaped for `docs/contracts.md` Section 5

Not included yet:

- Laravel `/api/dashboard/*` routes
- Authentication
- Live checkout or CRM data
- Manual CRM retry actions

## Stack

- Vite
- React + TypeScript
- Tailwind CSS v4 via `@tailwindcss/vite`

## Data boundary

Mock donor emails use `@example.test` addresses from the checkout fixtures. No payment or secret fields are rendered.
