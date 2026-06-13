# Hungry-4-Joy

Hungry-4-Joy is a demo prototype of a lean nonprofit donation ecosystem.

The goal is to show how a public campaign site, checkout events, middleware, CRM sync, analytics, observability, and a support dashboard can work together as one small system.

This is not intended to become a full fundraising platform. It is a focused MVP for demonstrating integration architecture, operational workflows, and production-style support boundaries.

## See the project (Render)

Hosted demo services:

| Service | URL |
| --- | --- |
| Campaign site (WordPress) | [hungry-4-joy-wordpress.onrender.com](https://hungry-4-joy-wordpress.onrender.com) |
| Integration status dashboard | [hungry-4-joy-dashboard.onrender.com](https://hungry-4-joy-dashboard.onrender.com) |
| Middleware API health | [hungry-4-joy-middleware.onrender.com/api/health](https://hungry-4-joy-middleware.onrender.com/api/health) |

Start on the **campaign site** for the donation flow. Open the **dashboard** to inspect checkout events, CRM sync status, and retry activity from live webhook ingest.

## Planned Ecosystem

```text
Donor / visitor
  |
  v
WordPress campaign site
  - campaign pages
  - donation buttons
  - one-time giving options
  - forms and content
  - campaign metadata
  |
  | donation amount / campaign selection
  v
Cart / Checkout
  - cart session
  - hosted checkout
  - modeled checkout handoff
  - campaign codes
  - transaction status
  |
  | webhook / transaction event
  v
Laravel middleware/API
  - validate webhook
  - normalize donor and donation data
  - deduplicate records
  - store application state
  - queue background jobs
  - retry failed syncs
  - log errors
  |
  +--> CRM / Marketing
  |      - contacts / donors
  |      - donation activity
  |      - campaign attribution
  |      - lists / segments
  |      - follow-up status
  |
  +--> Marketing analytics
  |      - browser events
  |      - server-side conversion events
  |      - consent-aware tracking
  |      - conversion reporting
  |
  +--> Observability / logging
  |      - webhook logs
  |      - sync failures
  |
  +--> Status dashboard
         - checkout events and webhook ingest
         - CRM sync status and failure detail
         - retry activity and manual CRM retry
         - filters by campaign, status, and date
```

## Project Progress

Track implementation status in [GitHub Issues](https://github.com/ChristopherMedrano/hungry-4-joy/issues) and [Milestones](https://github.com/ChristopherMedrano/hungry-4-joy/milestones).

## Project Stack

Frontend (WP/Dashboard):

- CMS: WordPress, campaign content.
- Theme: Twenty Twenty-Five, block foundation.
- Child theme: Hungry-4-Joy, project presentation.
- Style system: Sass/SCSS, compiled theme CSS.
- Status dashboard: Vite + React + Tailwind CSS in `dashboard/`.

Checkout and integrations:

- Checkout: Foxy.io / FoxyCart, hosted cart flow.
- CRM: HubSpot, donor contact sync.
- Analytics: marketing events, campaign tracking.

Backend and data:

- Framework: Laravel, middleware and APIs.
- Queue: Laravel jobs, retryable sync work.
- Database: PostgreSQL, SQLite.

Development and deployment:

- Local environment: DDEV, WordPress development.
- Hosting target: Render — WordPress, middleware API, and status dashboard (`render.yaml`).
- CI/CD: GitHub Actions, repeatable checks.

## Local Development

This project uses DDEV for local WordPress development.

Start the local environment:

```bash
ddev start
```

Launch the site:

```bash
ddev launch
```

Launch WordPress admin:

```bash
ddev launch /wp-admin
```

Stop the local environment:

```bash
ddev stop
```

## Laravel Middleware/API

The Laravel middleware/API app lives separately from WordPress files:

```text
middleware-api/
```

Install middleware/API dependencies:

```bash
cd middleware-api
composer install
```

Run local middleware/API migrations:

```bash
php artisan migrate
```

Start the local Laravel server:

```bash
php artisan serve
```

Use the URL printed by Artisan. If another local service already uses port `8000`, Laravel may choose the next available port, such as `8001`.

Verify the API health endpoint:

```bash
curl http://127.0.0.1:<printed-port>/api/health
```

Run middleware/API tests:

```bash
npm run test:middleware
```

Replay the tracked Foxy-shaped checkout event fixtures through the local middleware receiver:

```bash
npm run connect:foxy-demo
```

Run the current local stack checks from the repo root:

```bash
npm test
```

The status dashboard shell lives in `dashboard/` as a Vite + React + Tailwind app:

```bash
npm run dev:dashboard
```

See [`dashboard/README.md`](dashboard/README.md) for lint/build commands and [`docs/dashboard-verification-walkthrough.md`](docs/dashboard-verification-walkthrough.md) for fixture verification.

The middleware/API receives validated checkout events, stores normalized rows, syncs eligible donations to HubSpot with local status tracking, and exposes dashboard status and retry APIs.

## SCSS Workflow

Install project dependencies:

```bash
npm install
```

Compile WordPress child theme SCSS:

```bash
npm run build:wp-css
```

Watch SCSS during development:

```bash
npm run watch:wp-css
```

The root WordPress theme file stays here:

```text
wordpress/wp-content/themes/hungry-4-joy/style.css
```

That root file contains the WordPress theme header. The compiled browser CSS lives here:

```text
wordpress/wp-content/themes/hungry-4-joy/assets/css/style.css
```

## Repository Notes

WordPress core files are ignored. The repo tracks project-owned WordPress code, such as:

```text
wordpress/wp-content/themes/hungry-4-joy/
```

Local dependencies and runtime files are ignored:

```text
node_modules/
middleware-api/.env
middleware-api/vendor/
wordpress/wp-config.php
wordpress/wp-config-ddev.php
wordpress/wp-content/uploads/
wordpress/wp-content/cache/
```

## Documentation

- [Architecture](docs/architecture.md)
- [Campaign Page Setup](docs/campaign-page.md)
- [Data Contracts](docs/contracts.md)
- [Checkout And Payment Safety Boundary](docs/payment-safety-boundary.md)
- [Checkout Event Verification Walkthrough](docs/checkout-event-verification.md)
- [Middleware Receiver Verification](docs/middleware-receiver-verification.md)
- [Dashboard Verification Walkthrough](docs/dashboard-verification-walkthrough.md)
- [Foxy To Middleware Connection Plan](docs/foxy-middleware-connection-plan.md)
- [Render Deployment](docs/render-deployment.md)
- [Laravel Middleware/API Setup](middleware-api/README.md)
- [Workflow](docs/workflow.md)
