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
  -> queue jobs
  -> CRM / Marketing
  -> marketing analytics
  -> observability/logging
  -> React/Next.js status dashboard

GitHub Actions
  -> checks WordPress, Laravel, dashboard, and build workflows
```

## 1. WordPress Public Site

WordPress is the first piece of the system.

It acts as the public-facing nonprofit website where visitors discover campaigns and begin the donation flow.

Implementation direction:

- Use a Twenty Twenty-Five child theme.
- Use WordPress block editor patterns for simple campaign and donation layouts.
- Use Sass/SCSS for child theme styling, compiled into the theme CSS that WordPress enqueues.
- Add a small custom plugin only where needed for donation/campaign metadata and checkout handoff behavior.
- Avoid a heavy page-builder dependency in the MVP so the project demonstrates WordPress fundamentals, theme structure, hooks, and maintainable PHP.

MVP responsibilities:

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

Foxy.io / FoxyCart is the hosted cart/checkout layer. A separate payment gateway or test payment setup sits behind it. Local development can use simulated transaction events before connecting the full checkout workflow.

PCI boundary:

- The project should not collect, transmit, or store raw card data.
- WordPress and Laravel should only handle safe donation metadata, transaction IDs, statuses, timestamps, campaign codes, and donor/contact data.
- Payment authorization, declines, and sensitive payment method handling belong to FoxyCart and the connected test payment setup or gateway.
- The detailed payment safety boundary is documented in [`payment-safety-boundary.md`](payment-safety-boundary.md).

MVP event examples:

- `donation.created`
- `payment.failed`

Subscription and refund workflows are out of scope for the current milestone. They can be modeled later if the public site adds recurring donation controls or refund reconciliation work.

What this demonstrates:

- cart/checkout integration concepts
- payment status and gateway-response concepts
- cart/donation event structure
- PCI-aware data boundaries
- payment failure handling
- reconciliation thinking

## 3. Laravel Middleware/API

Laravel is the integration layer between the public site, FoxyCart transaction/webhook events, HubSpot, the database, and the admin dashboard.

Current local receiver responsibilities:

- receive safe checkout event fixture payloads
- validate the checkout event contract
- store safe normalized checkout event fields
- normalize campaign, donation, donor/contact, transaction, and redacted failure data
- prevent duplicate processing by `event_id` or `idempotency_key`

Future middleware responsibilities:

- receive production provider webhook events
- validate event signatures with a local demo signing value before production secrets are introduced
- queue HubSpot CRM/marketing sync jobs
- update HubSpot contact/activity/deal or follow-up status with donation details
- log success and failure states
- expose status data to the admin dashboard

What this demonstrates:

- PHP/Laravel
- REST endpoints
- webhooks
- queues and jobs
- idempotency
- integration logging
- production-style troubleshooting

## 4. Database

The database stores the local integration state.

MVP data areas:

- donors
- donations
- campaigns
- webhook events
- CRM sync attempts
- integration failures

What this demonstrates:

- schema design
- SQL queries
- transaction records
- sync status tracking
- reconciliation

## 5. CRM Integration

The selected CRM and marketing-platform target is HubSpot.

MVP responsibilities:

- find or create a donor/contact
- send donation details to HubSpot
- record sync success or failure
- handle duplicate contacts
- add or update campaign attribution
- add donor to a campaign list/segment or mark follow-up status
- retry failed syncs safely

What this demonstrates:

- CRM API integration
- HubSpot forms, contacts, lists, and marketing follow-up concepts
- contact/donor records
- field mapping
- duplicate handling
- sync troubleshooting

## 6. Marketing Analytics / Event Tracking

Marketing analytics tracks the donation journey and campaign performance. This section is modeled on common nonprofit campaign requirements: tag-manager style browser events, Meta/Facebook Pixel-style conversion events, server-side conversion events, and consent-aware tracking.

Event names, safe properties, browser/server responsibilities, and debugging notes are defined in [`contracts.md`](contracts.md) — Section 6 Marketing Analytics Events.

This is separate from error monitoring.

Implementation direction:

- Use GTM-style event naming and a simple local `dataLayer` pattern.
- Model browser-side Meta Pixel-style events for the donation journey.
- Model server-side Meta Conversions API-style events after Laravel receives confirmed FoxyCart donation events.
- Respect consent/cookie state before firing browser-side marketing tags.

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

MVP responsibilities:

- Laravel logs
- FoxyCart webhook receipt and validation logs
- HubSpot API request/response error logs
- health/status checks

Optional later tools:

- Sentry
- OpenTelemetry Collector for exporting app traces, logs, and metrics to Sentry or another backend
- uptime checks
- structured log streaming
- scheduled backup/restore check notes
- access-control review checklist

MVP boundary:

- The admin dashboard uses application-owned tables as the source of truth for donation and CRM sync status.
- OpenTelemetry is an optional later layer for developer observability, not the business/integration dashboard itself.
- External SaaS internals are not directly observable through OpenTelemetry; the app can only record its own webhook handling, API calls, response codes, exceptions, retries, and timings.

What this demonstrates:

- production support
- monitoring, logging, and alerting
- incident debugging
- exception handling
- webhook and API troubleshooting
- queue/job failure analysis
- backup and access-control awareness
- operational visibility

## 8. Admin / Status Dashboard

The admin dashboard is the support surface for the ecosystem.

The dashboard reads from application tables: stored checkout events and CRM sync attempts.

Implementation direction:

- Use React or Next.js for the dashboard front end.
- Use Tailwind CSS for dashboard UI styling.
- Use Laravel as the API and integration backend.
- Start with the simplest useful dashboard; avoid turning the dashboard into a full admin product before the integration flow works.

MVP responsibilities:

- view checkout events and webhook ingest path
- view CRM sync status and failure detail
- filter by campaign, status, date, and free-text search
- view retry activity for failed, retryable, and list-warning syncs
- trigger safe manual CRM retries when eligible

Optional later polish:

- store `trace_id` or `sentry_event_id` on integration failure records
- link from a dashboard failure row to the matching Sentry error or OpenTelemetry trace
- show timing summaries for webhook processing and HubSpot sync jobs

What this demonstrates:

- React/Next.js front-end patterns
- Tailwind CSS dashboard styling
- API-connected dashboard UI
- support tooling
- operational workflows
- status reporting
- safe retries
- business-specific issue triage

## 9. CI/CD and Code Quality

GitHub and GitHub Actions should provide the public project workflow.

MVP responsibilities:

- run automated checks on pull requests or pushes
- install PHP dependencies with Composer
- run Laravel tests with PHPUnit or Pest
- run Laravel Pint for PHP formatting
- optionally run PHPStan or Larastan for static analysis after the core MVP stabilizes
- run Sass/SCSS build checks for the WordPress child theme when the theme styling workflow is added
- run JavaScript/React/Next.js/Tailwind lint, typecheck, and build checks when the dashboard is added
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
  -> queue job processes donation
  -> donor/donation details sync to HubSpot
  -> HubSpot campaign list/follow-up status is updated
  -> marketing analytics event is logged
  -> admin dashboard shows success/failure from application tables
```

## MVP Operational Scenarios

The architecture supports several operational scenarios:

- failed checkout
- missing HubSpot gift
- duplicate webhook event
- campaign launch
- HubSpot field mapping error
- payment failure
- failed retry job
- reconciliation mismatch
- analytics consent or duplicate-event issue
- campaign page quality issue
- repeated failure alert / incident review

### Campaign Launch With HubSpot

HubSpot is especially useful for the campaign-launch workflow.

Example flow:

```text
WordPress campaign page
  -> HubSpot form or contact capture
  -> FoxyCart checkout metadata
  -> Laravel webhook processing
  -> HubSpot contact/activity/deal update with donation amount
  -> HubSpot campaign list or segment
  -> email follow-up or simulated follow-up status
  -> analytics conversion event
```

What this demonstrates:

- creating a campaign page
- capturing or updating a HubSpot contact
- preserving campaign attribution
- mapping donation metadata into HubSpot
- tracking donor and donation amount after FoxyCart confirms the donation
- enrolling or marking the donor for campaign-related email follow-up
- debugging CRM and marketing data flow

Feasibility note:

- If the HubSpot free account supports list membership, forms, and contact properties but not full automated workflows, the MVP can still model the workflow by updating contact properties, adding the donor to a campaign list/segment, and recording a `follow_up_status`.
- If automated email workflows are available, the donor can be enrolled in an actual campaign follow-up workflow after the Laravel middleware syncs the donation details.

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

- FoxyCart confirms the donation, but HubSpot does not show the expected contact/activity/deal or follow-up status.

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
- retry activity and manual retry from the dashboard

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

### Repeated Failure Alert / Incident Review

Scenario:

- Webhook validation, queue processing, or HubSpot sync fails repeatedly and triggers an alert flag.

What this demonstrates:

- reviewing CRM sync errors and retry activity in the dashboard
- identifying cause from stored error summaries
- verifying recovery after manual retry

## Deployment Direction

Local WordPress development uses DDEV.

In local development, DDEV runs the WordPress site, while the Laravel middleware/API can run separately with `php artisan serve` and local sqlite storage. This keeps the MVP reproducible and avoids depending on hosted infrastructure while the system is still changing quickly.

Render is the preferred deployment target for the Laravel side of the MVP.

Good Render candidates:

- Laravel middleware/API as a web service
- queue worker as a background worker
- scheduled cleanup/reconciliation task as a cron job
- React/Next.js dashboard as either a separate web service/static deployment or as part of the Laravel-served app, depending on the final dashboard approach
- database as a managed datastore, likely Postgres for deployment even if local development uses DDEV-managed MySQL or MariaDB
- logs, metrics, health checks, environment variables, deploy hooks, and rollbacks

WordPress should be developed locally in DDEV first. It can be hosted separately later or explored on Render with Docker/persistent storage, but the MVP should keep WordPress simple until the Laravel integration flow works.

## Guiding Principle

Build the smallest version that touches every important boundary:

```text
WordPress -> FoxyCart checkout event -> Laravel -> database -> HubSpot -> dashboard
```

Once that path works, improve realism one system at a time.
