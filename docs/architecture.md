# Hungry-4-Joy Architecture

Hungry-4-Joy is a lean nonprofit donation ecosystem built as a personal educational prototype for web development, integrations, and production-support workflows.

The goal is not to build a full fundraising platform. The goal is to create a small, understandable system that demonstrates the boundaries a nonprofit web stack may need to support: WordPress pages, FoxyCart checkout events, middleware, CRM sync, analytics, and operational troubleshooting.

## High-Level Ecosystem

```text
Donor / visitor
  -> WordPress campaign site
  -> Cart / Checkout
  -> Laravel middleware/API

Laravel middleware/API
  -> application database
  -> synchronous queue jobs (current hosted demo)
  -> HubSpot CRM
  -> local browser/server conversion records
  -> observability/logging
  -> React status dashboard

GitHub Actions
  -> checks WordPress, Laravel, dashboard, and build workflows
```

## 1. WordPress Public Site

WordPress is the first piece of the system.

It acts as the public-facing nonprofit website where visitors discover campaigns and begin the donation flow.

Implemented structure:

- A Twenty Twenty-Five child theme supplies repository-owned presentation.
- WordPress block patterns define campaign and donation layouts.
- Sass/SCSS compiles into the child-theme CSS that WordPress enqueues.
- A small custom plugin owns donation metadata and checkout handoff behavior.
- The demo avoids a heavy page-builder dependency.

Responsibilities:

- donation landing pages
- project/campaign pages
- donation amount buttons
- one-time giving options
- campaign or project metadata passed into checkout
- basic accessibility, SEO, and performance hygiene
- semantic headings, labels, button text, focus states, and color contrast
- basic metadata, clean URLs, structured page content, and performance-conscious assets

What this demonstrates:

- WordPress content structure
- PHP/theme/plugin basics
- HTML, CSS, Sass/SCSS, and JavaScript
- accessibility and SEO fundamentals
- campaign page maintenance
- front-end troubleshooting

## 2. Checkout / Payment Event Layer

The checkout layer uses Foxy.io / FoxyCart.

Foxy.io / FoxyCart is the hosted cart/checkout layer with a sandbox payment
gateway behind it. Local development uses tracked simulated transaction events;
the hosted demo also receives signed Foxy webhooks.

PCI boundary:

- The project should not collect, transmit, or store raw card data.
- WordPress and Laravel should only handle safe donation metadata, transaction IDs, statuses, timestamps, campaign codes, and donor/contact data.
- Payment authorization, declines, and sensitive payment method handling belong to FoxyCart and the connected test payment setup or gateway.
- The detailed payment safety boundary is documented in [`payment-safety-boundary.md`](payment-safety-boundary.md).

Implemented event types:

- `donation.created`
- `payment.failed`

Subscription and refund workflows are out of scope for this portfolio demo.

What this demonstrates:

- cart/checkout integration concepts
- payment status and gateway-response concepts
- cart/donation event structure
- PCI-aware data boundaries
- payment failure handling
- reconciliation thinking

## 3. Laravel Middleware/API

Laravel is the integration layer between the public site, FoxyCart transaction/webhook events, HubSpot, the database, and the admin dashboard.

Current middleware responsibilities:

- receive signed Foxy webhook events in the hosted demo and safe checkout event
  fixture payloads in local/test environments
- validate the checkout event contract
- store safe normalized checkout event fields
- normalize campaign, donation, donor/contact, transaction, and redacted failure data
- prevent duplicate processing by `event_id` or `idempotency_key`

It also validates Foxy signatures, dispatches HubSpot CRM sync jobs, records
success/failure state, and exposes operator-protected status data to the
dashboard. On Render, `QUEUE_CONNECTION=sync` executes jobs in the middleware
request; no background worker is provisioned.

What this demonstrates:

- PHP/Laravel
- REST endpoints
- webhooks
- queues and jobs
- idempotency
- integration logging
- production-style troubleshooting

## 4. Database

The application database stores normalized integration state in five
project-owned tables:

- `checkout_events` — safe normalized checkout/webhook records
- `checkout_handoffs` — click-time attempt registration and reconciliation state
- `crm_sync_attempts` — HubSpot status, safe references, warnings, errors, and
  retry metadata
- `server_analytics_events` — stored server conversion records
- `integration_step_logs` — safe attempt-level pipeline chronology

Donor, donation, campaign, webhook, and failure details are fields on these
records; the application does not maintain separate tables for those concepts.

What this demonstrates:

- schema design
- SQL queries
- transaction records
- sync status tracking
- reconciliation

## 5. CRM Integration

The selected CRM target is HubSpot.

Responsibilities:

- upsert a Contact by donor email
- create one donation Deal and associate it to the Contact
- map safe donation and campaign attribution fields onto the Deal
- enroll the Contact in one configured static list
- store safe success, warning, error, and retry state locally
- allow bounded manual retries while preventing duplicate clean-success work

What this demonstrates:

- CRM API integration
- HubSpot Contacts, Deals, associations, and static lists
- field mapping
- duplicate handling
- sync troubleshooting

## 6. Marketing Analytics / Event Tracking

Marketing analytics tracks the donation journey and campaign performance. This section is modeled on common nonprofit campaign requirements: tag-manager style browser events, Meta/Facebook Pixel-style conversion events, server-side conversion events, and consent-aware tracking.

Event names, safe properties, browser/server responsibilities, and debugging notes are defined in [`contracts.md`](contracts.md) — Section 6 Marketing Analytics Events.

This is separate from error monitoring.

Current implementation:

- Uses GTM-style event names in a local `dataLayer`.
- Models browser-side marketing events for the donation journey.
- Stores server conversion records after Laravel receives confirmed FoxyCart
  donation events.
- Respects consent/cookie state before firing browser-side marketing events.
- Does not deliver events to external analytics providers.

Example events:

- `PageView`
- `ViewCampaign`
- `StartDonation`
- `InitiateCheckout`
- `DonationCompleted`
- `PaymentFailed`
- `HubSpotSyncSucceeded`
- `HubSpotSyncFailed`

What this demonstrates:

- conversion tracking concepts
- event naming
- campaign attribution
- GTM-style browser event flow
- Meta Pixel-style browser events
- Meta Conversions API-style server events
- consent-aware tag behavior
- debugging duplicate or missing events

## 7. Observability / Error Monitoring

Observability tracks whether the system is healthy, where failures happen, and what a developer should check during production-style support.

Responsibilities:

- Laravel logs
- `integration_step_logs` pipeline step records (see `docs/contracts.md` Section 7)
- FoxyCart webhook receipt and validation logs
- HubSpot API request/response error logs
- health/status checks (`GET /api/health` public liveness, operator-protected `GET /api/health/ready` readiness)
- dashboard **System status** tab and header strip backed by readiness checks

Optional later tools:

- Sentry
- OpenTelemetry Collector for exporting app traces, logs, and metrics to Sentry or another backend
- uptime checks
- structured log streaming
- scheduled backup/restore check notes
- access-control review checklist

Current boundary:

- The admin dashboard uses application-owned tables as the source of truth for donation, CRM sync, and integration step status.
- OpenTelemetry is an optional later layer for developer observability, not the business/integration dashboard itself.
- External SaaS internals are not directly observable through OpenTelemetry; the app can only record its own webhook handling, API calls, response codes, exceptions, retries, and timings.

What this demonstrates:

- production support
- monitoring and logging
- incident debugging
- exception handling
- webhook and API troubleshooting
- queue/job failure analysis
- backup and access-control awareness
- operational visibility

## 8. Admin / Status Dashboard

The admin dashboard is the support surface for the ecosystem.

The dashboard reads from application tables: stored checkout events and CRM sync attempts.

Current implementation:

- React/Vite provides the dashboard front end.
- Tailwind CSS provides dashboard UI styling.
- Laravel provides the protected API and integration backend.
- A seeded notification presentation remains in the portfolio UI. Automated
  incident flags and external notification delivery are out of scope.

Responsibilities:

- view checkout events and webhook ingest path
- view CRM sync status and failure detail
- view integration step timeline on checkout attempt trace
- view middleware readiness (database, migrations, Foxy, HubSpot, queue) on System status tab
- filter by campaign, status, date, and free-text search
- view CRM sync issues for failed, retryable, and list-warning syncs
- trigger safe manual CRM retries when eligible

Optional later polish:

- store `trace_id` or `sentry_event_id` on integration failure records
- link from a dashboard failure row to the matching Sentry error or OpenTelemetry trace
- show timing summaries for webhook processing and HubSpot sync jobs

What this demonstrates:

- React/Vite front-end patterns
- Tailwind CSS dashboard styling
- API-connected dashboard UI
- support tooling
- operational workflows
- status reporting
- safe retries
- business-specific issue triage

## 9. CI/CD and Code Quality

GitHub and GitHub Actions provide the public project workflow.

Responsibilities:

- run automated checks on pull requests or pushes
- install PHP dependencies with Composer
- run Laravel tests with PHPUnit or Pest
- run Laravel Pint for PHP formatting
- optionally run PHPStan or Larastan for static analysis after the core MVP stabilizes
- run Sass/SCSS build reproducibility checks for the WordPress child theme
- run JavaScript/React/Vite/Tailwind lint, typecheck, and build checks for the dashboard
- keep environment variables out of git

What this demonstrates:

- Git and GitHub workflow
- CI YAML
- automated test checks
- PHP code quality
- front-end build checks
- deployment readiness

## Core Data Flow

```text
Visitor views WordPress campaign page
  -> chooses one-time donation amount
  -> WordPress passes campaign metadata to FoxyCart
  -> FoxyCart creates transaction/webhook event
  -> Laravel receives, validates, and stores event
  -> synchronous queue job processes donation in the middleware request
  -> donor email upserts a Contact; one donation Deal is created and associated
  -> Contact is enrolled in the configured static list
  -> browser and server conversion events are recorded locally
  -> admin dashboard shows success/failure from application tables
```

## MVP Operational Scenarios

The architecture supports several operational scenarios:

- failed checkout
- missing HubSpot gift
- duplicate webhook event
- HubSpot field mapping error
- payment failure
- failed retry job
- reconciliation mismatch
- analytics consent or duplicate-event issue
- campaign page quality issue

### Failed Checkout

Scenario:

- A visitor starts a donation, but the FoxyCart checkout does not produce a successful donation event.

What this demonstrates:

- checking the WordPress-to-FoxyCart metadata handoff
- reviewing payment status and gateway-response concepts
- recording safe failed-payment status and redacted failure details
- avoiding false donation records

### Missing HubSpot Gift

Scenario:

- FoxyCart confirms the donation, but HubSpot does not show the expected Contact,
  donation Deal, Contact-to-Deal association, or static-list membership.

What this demonstrates:

- checking Laravel webhook receipt
- reviewing queue job status
- inspecting HubSpot API errors
- retrying the sync safely

### Duplicate Webhook Event

Scenario:

- The same FoxyCart event is received more than once.

What this demonstrates:

- idempotency
- duplicate event detection
- preserving safe normalized event records
- preventing duplicate donation and HubSpot records

### HubSpot Field Mapping Error

Scenario:

- HubSpot rejects a sync because a required field is missing, malformed, or mapped to the wrong property.

What this demonstrates:

- reviewing HubSpot API error responses
- correcting field mapping
- retrying failed syncs
- keeping donor and donation data consistent

### Failed Retry Job

Scenario:

- A retry is attempted, but the queue job still fails.

What this demonstrates:

- queue failure analysis
- CRM sync issues and manual retry from the dashboard

### Reconciliation Mismatch

Scenario:

- FoxyCart shows a completed donation, but the local database, HubSpot, or dashboard status does not match.

What this demonstrates:

- comparing source transaction events against local donation records by `donation_attempt_id`
- checking webhook receipt and CRM sync status in the dashboard
- reviewing HubSpot sync attempts and deal attempt id in detail views
- correcting the issue without duplicating donations

### Analytics Consent or Duplicate-Event Issue

Scenario:

- A marketing event fires twice, fires before consent, or does not fire after a confirmed donation.

What this demonstrates:

- debugging `dataLayer`-style browser events
- checking consent-aware tag behavior
- comparing browser-side events with server-side conversion events
- preventing duplicate `DonationCompleted` events

### Campaign Page Quality Issue

Scenario:

- A campaign page has a layout, accessibility, SEO, or performance problem.

What this demonstrates:

- WordPress theme/block editing
- campaign metadata handoff checks
- mobile layout review
- accessibility and SEO hygiene
- front-end troubleshooting

## Deployment Direction

Local WordPress development uses DDEV.

In local development, DDEV runs the WordPress site, while the Laravel middleware/API can run separately with `php artisan serve` and local sqlite storage. This keeps the MVP reproducible and avoids depending on hosted infrastructure while the system is still changing quickly.

The hosted demo currently runs four Render resources defined in `render.yaml`:

- `hungry-4-joy-wordpress`, a Docker web service with intentionally ephemeral
  SQLite, uploads, and administrator edits; startup reseeds repository-owned
  demo content;
- `hungry-4-joy-middleware`, a Docker web service connected to
  `hungry-4-joy-middleware-db`, a free Render Postgres database;
- `hungry-4-joy-dashboard`, a Docker web service that serves the Vite build
  through nginx and proxies `/api` requests to the middleware; and
- no background worker or Render cron service. Queue jobs use the `sync` driver,
  and scheduled handoff reconciliation is disabled by default.

Free Render Postgres expires after 30 days, has a 14-day paid-upgrade grace
period, and provides no managed backups or point-in-time recovery. WordPress's
ephemeral runtime and the dashboard's static build are recovered from Git, not
from runtime backups. See [`render-deployment.md`](render-deployment.md) for
deployment verification and
[`backup-restore-rollback.md`](backup-restore-rollback.md) for ownership,
database preservation, and service rollback procedures.

## Guiding Principle

Build the smallest version that touches every important boundary:

```text
WordPress -> FoxyCart checkout event -> Laravel -> database -> HubSpot -> dashboard
```

Once that path works, improve realism one system at a time.
