# Hungry-4-Joy

Hungry-4-Joy is a personal educational prototype of a lean nonprofit donation ecosystem.

The goal is to show how a public campaign site, checkout events, middleware, CRM sync, analytics, observability, and a support dashboard can work together as one small system.

This is not intended to become a full fundraising platform. It is a focused MVP for demonstrating integration architecture, operational workflows, and production-style support boundaries.

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
  |      - retry history
  |      - incident notes
  |
  +--> Status dashboard
         - donations
         - webhook events
         - CRM sync status
         - failures and retries
         - reconciliation notes
```

## Project Progress

The first implementation slices establish the WordPress public site and the Laravel middleware/API foundation.

Current:

- DDEV WordPress local environment
- Twenty Twenty-Five child theme
- Sass/SCSS source workflow for child theme styling
- compiled child theme CSS enqueued by WordPress
- campaign page with one-time donation buttons
- safe Foxy demo cart handoff
- root-level Laravel middleware/API app in `middleware-api/`
- local Laravel API health endpoint at `/api/health`
- checkout event receiver at `/api/checkout/events`
- safe normalized checkout event storage and duplicate prevention
- architecture and workflow documentation

Planned:

- provider signature verification for production webhook receiving
- HubSpot CRM sync
- marketing analytics events
- observability and retry visibility
- React/Next.js admin/status dashboard

## Project Stack

Front End:

- CMS: WordPress, campaign content.
- Theme: Twenty Twenty-Five, block foundation.
- Child theme: Hungry-4-Joy, project presentation.
- Style system: Sass/SCSS, compiled theme CSS.

Checkout and integrations:

- Checkout: Foxy.io / FoxyCart, hosted cart flow.
- CRM: HubSpot, donor contact sync.
- Analytics: marketing events, campaign tracking.

Backend and data:

- Framework: Laravel, middleware and APIs.
- Queue: Laravel jobs, retryable sync work.
- Database: local app state, audit trail.

Dashboard:

- Front end: React or Next.js, status UI.
- Style framework: Tailwind CSS, dashboard components.

Development and deployment:

- Local environment: DDEV, WordPress development.
- Hosting target: Render, app services.
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

Create local middleware/API environment config if `.env` is missing:

```bash
if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
fi
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

Run the current local stack checks from the repo root:

```bash
npm test
```

The middleware/API now receives validated checkout event fixtures and stores safe normalized checkout event rows. It does not yet verify provider signatures, sync CRM data, emit analytics, or power dashboard views.

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
- [Laravel Middleware/API Setup](middleware-api/README.md)
- [Workflow](docs/workflow.md)

## Guiding Principle

Build small, demoable slices that prove one integration boundary at a time.
