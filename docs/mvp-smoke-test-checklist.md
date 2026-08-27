# MVP Smoke-Test Checklist

Use this checklist for the final Hungry-4-Joy demo rehearsal. Tier 1 is the
required release check: it uses repository fixtures, an isolated test database,
local SQLite, fake HubSpot behavior, and disabled analytics-provider writes.
Tier 2 touches hosted services and is optional; run it only with explicit
authorization from the service owner.

Detailed troubleshooting stays in the focused walkthroughs:

- [Campaign and checkout metadata](checkout-event-verification.md)
- [Middleware receiver](middleware-receiver-verification.md)
- [Dashboard](dashboard-verification-walkthrough.md)
- [Foxy handoff, reconciliation, and webhook behavior](foxy-middleware-connection-plan.md)
- [Access control](access-control.md)
- [Payment safety boundary](payment-safety-boundary.md)
- [Render deployment](render-deployment.md)

## Result record

Record the commit and environment before starting. Do not include donor data,
credentials, authorization headers, provider payloads, or token-bearing URLs in
screenshots or notes.

| Field | Value |
| --- | --- |
| Commit (`git rev-parse --short HEAD`) | |
| Tester / date | |
| Tier 1 automated checks | Pass / Fail |
| Static campaign + local dashboard check | Pass / Fail / Not run |
| Tier 2 authorized hosted check | Pass / Fail / Not authorized |
| Evidence locations | |
| Failures / follow-up issue links | |
| Final decision | Go / No-go |

For each failure, capture the step, expected and actual result, safe error code,
reproduction notes, and owning component. Stop the rehearsal when a secret or
payment field is exposed, a command points at a non-local database, a provider
write is unexpectedly attempted, duplicate processing occurs, or a required
check fails in a way that makes later results unreliable.

## Tier 1 — safe local rehearsal (required)

### 1. Preflight and safety boundary

- [ ] Work from the repository root and record the current commit.
- [ ] Review `git status --short`; do not discard unrelated changes.
- [ ] Install the declared root, middleware, and dashboard dependencies when
  they are not already present.
- [ ] Confirm local middleware configuration uses `APP_ENV=local`,
  `DB_CONNECTION=sqlite`, `HUBSPOT_ENABLED=false`,
  `ANALYTICS_PROVIDERS_ENABLED=false` (or leaves it unset), and
  `QUEUE_CONNECTION=sync`.
- [ ] Confirm provider credentials are absent from the local rehearsal config.
  Do not print the environment or run configuration-dump commands that could
  expose it.
- [ ] Set a private local `DASHBOARD_OPERATOR_TOKEN` only in the untracked
  `middleware-api/.env`. Enter it later only in the dashboard unlock form.

Install the locked dependencies when needed:

```bash
npm ci
cd middleware-api && composer install && cd ..
cd dashboard && npm ci && cd ..
```

If `middleware-api/.env` does not exist, create it from `.env.example`, generate
the Laravel application key, and then review the file privately:

```bash
cd middleware-api
cp .env.example .env
php artisan key:generate
cd ..
```

Do not overwrite an existing `.env`. Tests use the in-memory SQLite database
declared in `middleware-api/phpunit.xml`; they do not use the local application
database or provider credentials.

### 2. Full automated release gate

From the repository root:

```bash
npm test
npm run test:dashboard
```

Pass cues:

- [ ] WordPress Sass compiles, fixture JSON validates, and WordPress security,
  donation-attempt, and donation-analytics checks pass.
- [ ] The complete Laravel test suite passes.
- [ ] Dashboard operator lifecycle tests, dashboard API tests, lint, typecheck,
  and production build pass.
- [ ] `git diff --check` reports no whitespace errors.
- [ ] The current GitHub Actions run for the same commit is green. CI validates
  the repository but does not deploy or call Render, Foxy, HubSpot, or an
  analytics provider.

### 3. Campaign metadata, analytics, and fixtures

Run the focused checks:

```bash
npm run test:donation-attempt-js
npm run test:donation-analytics-js
npm run check:fixtures
rg -c 'class="h4j-donation-button foxycart"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-checkout-provider="foxy"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
jq -r 'input_filename + ": " + .event_type + " / " + .transaction_status + " / " + .donation_attempt_id' examples/checkout-events/*.json
nl -ba wordpress/wp-content/themes/hungry-4-joy/functions.php | sed -n '104,120p'
nl -ba wordpress/wp-content/themes/hungry-4-joy/assets/js/donation-attempt.js | sed -n '32,70p'
cd middleware-api && php artisan test --filter=CheckoutHandoffRegistrationTest && cd ..
```

Pass cues:

- [ ] Both count commands return `6`.
- [ ] Static button markup contains matching campaign, amount, label, donation
  type, source, and checkout-provider attributes.
- [ ] The donation-attempt JavaScript test proves opaque `h4j_attempt_*`
  generation (including its fallback), Foxy cart URL parameter mutation and
  replacement, `dataset.donationAttemptId` assignment, capture-phase listener
  registration, and resilience for non-link targets or a failing URL read. It
  does not exercise handoff registration.
- [ ] Static source inspection confirms `functions.php` lines 113–120 localize
  `H4J_HANDOFF_CONFIG.apiUrl` from `MIDDLEWARE_API_URL`, while
  `donation-attempt.js` lines 32–70 define the safe handoff payload and the
  `POST /api/checkout/handoffs` path. This is contract inspection, not a
  browser request.
- [ ] `CheckoutHandoffRegistrationTest` separately proves the local Laravel
  receiver accepts and stores a valid handoff, ignores a duplicate attempt,
  rejects invalid/missing fields, and can be disabled. It uses in-memory SQLite
  and does not prove that the WordPress browser issued a POST.
- [ ] Browser analytics remain blocked before/after denied consent; granted
  consent emits `PageView`, `StartDonation`, and `InitiateCheckout` with unique
  analytics IDs, and duplicate page-view tracking is suppressed.
- [ ] The three JSON fixtures are valid and represent completed, pending, and
  failed one-time checkout states using fictional `@example.test` donors.

The JavaScript checks do not activate a donation button, open Foxy, call hosted
middleware, or send events to an external analytics provider. They inspect the
local handoff and `dataLayer` contracts only. Do not click a donation button in
Tier 1.

### 4. Receiver, idempotency, CRM, retry, and server analytics

Run these focused acceptance suites from `middleware-api/`:

```bash
cd middleware-api
php artisan test --filter=CheckoutEventFixtureReceiverTest
php artisan test --filter=HubSpotSyncDispatchTest
php artisan test --filter=HubSpotDonationSyncerTest
php artisan test --filter=DashboardCrmSyncRetryTest
php artisan test --filter=ServerAnalyticsConversionTest
php artisan test --filter=FoxyTransactionMapperTest
cd ..
```

Pass cues:

- [ ] Happy path: the completed fixture is accepted, normalized once, dispatches
  one CRM sync, succeeds through `FakeHubSpotClient`, and stores
  `DonationCompleted` plus `HubSpotSyncSucceeded` analytics rows.
- [ ] Failed payment: the failure fixture is accepted with redacted failure
  fields, skips CRM, and stores `PaymentFailed` rather than
  `DonationCompleted`.
- [ ] Duplicate event: the second replay returns `duplicate_ignored`, adds no
  checkout row, dispatches no second CRM sync, and adds no duplicate server
  conversion row.
- [ ] Failed CRM sync: a fake `503` produces a safe `retryable` attempt without
  rejecting checkout ingest and stores `HubSpotSyncFailed`.
- [ ] Retry: eligible failed, retryable, and list-warning attempts can be
  retried; clean succeeded, pending, and unknown attempts are rejected with the
  documented status.
- [ ] Server analytics are stored locally and external analytics-provider
  writes remain disabled.
- [ ] Foxy mapping treats an empty raw transaction status as
  `donation.created` / `completed`. It is **not** a payment failure.
  Explicit `declined`, `rejected`, or `failed` statuses map to failure, and an
  unknown non-empty status fails closed.

These suites use in-memory SQLite and fake clients. They make no live Foxy,
HubSpot, CRM, notification, or analytics-provider writes.

### 5. Local API and dashboard browser rehearsal

This optional manual part adds/reuses only tracked fictional demo rows in the
configured local SQLite database. `dashboard:seed-status-demo` is idempotent;
do not use `migrate:fresh`, delete a database file, or point this workflow at
Postgres merely to obtain a clean row count.

Terminal 1:

```bash
cd middleware-api
php artisan migrate
php artisan dashboard:seed-status-demo
php artisan checkout:replay-fixtures
php artisan serve
```

Expected command cues:

- [ ] The seeder reports that dashboard rows are ready.
- [ ] Fixture replay reports `accepted` on a new local database or
  `duplicate_ignored` for rows already present. Re-run it and confirm all three
  fixtures report `duplicate_ignored`.
- [ ] `php artisan serve` prints the local API URL. Use that exact port below.

Terminal 2:

```bash
cd dashboard
npm run dev
```

Browser checks:

- [ ] Open the Vite URL. Seeded mode works without credentials and displays the
  representative completed, pending, failed, CRM-warning, CRM-failed, and
  retryable states.
- [ ] Select **Local API (demo fixtures)**, enter the private local operator
  token in the unlock form, and confirm System status loads. Database and
  migrations should be OK; Foxy, HubSpot, or WordPress may be degraded because
  providers are intentionally unconfigured.
- [ ] Checkout events contain the eight idempotent dashboard scenarios plus any
  local contract fixtures that were not already present. Search by the fixture
  `donation_attempt_id`; open detail and verify campaign, ingest, transaction,
  CRM, server-analytics, and safe error context.
- [ ] CRM Sync Issues shows failed, retryable, and list-warning rows. Retry the
  fictional retryable row and confirm it becomes Synced through the fake client
  without creating a second checkout row.
- [ ] Server Analytics includes locally stored conversion/CRM records and no
  raw donor email, payment data, or credentials in its payload detail.
- [ ] Checkout Attempts / attempt detail shows a chronological integration
  timeline where logs exist. Do not run reconcile or sweep: those actions can
  call Foxy when hAPI credentials are configured.
- [ ] Click **Lock** and confirm live data disappears; refreshing requires the
  token again. Never capture the token in evidence.

Do not open or activate the WordPress campaign page during Tier 1 because its
runtime can load Foxy assets. Treat
`wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html` as the
static DOM source: inspect all six links for matching labels, amounts,
campaigns, accessible names, and `data-*` attributes. The automated
donation-attempt test supplies click-time behavior evidence without a browser
or network request: ID generation, URL mutation, dataset assignment, and
handler resilience only. Handoff registration is covered by the static
source/config inspection and isolated Laravel receiver test above. Tier 1 must
make no request to Foxy or hosted middleware.
Cleanup is limited to stopping the local Laravel and dashboard development
servers; no database reset is required.

### 6. Local observability and unavailable features

- [ ] `GET /api/health` returns `200` and `status: ok` locally.
- [ ] The unlocked System status view calls protected `GET /api/health/ready`.
  A degraded optional integration is acceptable; an unreachable database or
  pending migration is a failure.
- [ ] Event detail and attempt trace expose safe chronological integration-step
  summaries without authorization headers, tokens, or raw provider payloads.
- [ ] Confirm the current runtime uses the synchronous queue. There is no
  background queue worker, scheduler worker, or Render cron service. Scheduled
  handoff reconciliation is off by default and must not be presented as active.
- [ ] External notification delivery and the repeated-failure incident/alert
  feed from issue #46 are not implemented. Seeded notification UI is a visual
  preview, not evidence that alerts were delivered.
- [ ] External analytics-provider delivery is also unavailable. WordPress
  hard-codes `providersEnabled=false`; Laravel always preserves stored server
  records, and enabling its provider flag only logs
  `[H4J analytics provider write disabled]` instead of sending. There is no
  external analytics sender to verify in this MVP.

## Tier 2 — hosted/provider verification (explicit authorization required)

Do not infer authorization from access to a browser, Render, Foxy, or HubSpot.
Before starting, record the authorizer, affected demo services, permitted
writes, maintenance window, rollback owner, and cleanup owner. Use sandbox/test
payment details only. Do not send fixture JSON to production: the fixture route
returns `404` there by design.

### Read-only hosted checks

- [ ] Campaign page, dashboard shell, and middleware `GET /api/health` load.
- [ ] The dashboard opens locked. Enter the privately supplied operator token
  only in its unlock form; never put it in a URL, command argument, shell
  history, screenshot, or evidence file.
- [ ] Without a token, detailed readiness and `/api/dashboard/*` return `401`.
- [ ] After unlock, System status loads and distinguishes optional degradation
  from database/readiness failure.

### Authorized write path

- [ ] Confirm Foxy webhook signing and provider configuration with the service
  owner before checkout.
- [ ] Click one hosted campaign donation button. In browser developer tools,
  verify public `POST /api/checkout/handoffs` returns `202` and the same opaque
  attempt ID reaches Foxy. Do not capture donor or token-bearing requests.
- [ ] Complete one sandbox-approved checkout. Confirm the signed webhook creates
  one dashboard event, links the handoff, and records integration steps. An
  empty Foxy transaction `status` is the verified completed outcome; check
  `data_is_fed` only as webhook-delivery state, never as payment status.
- [ ] Refeed the same signed webhook only when provider replay was explicitly
  authorized. A correct existing row returns `duplicate_ignored`; `corrected`
  is reserved for the documented legacy empty-status remediation signature.
- [ ] Run a sandbox gateway decline only when authorized. The verified ZIP
  `46282` path creates a Foxy cart/error-log entry but no transaction, so the
  expected attempt has `checkout_event: null` and
  `foxy_transaction_not_found`. It is not expected to create the local failed
  payment fixture event.
- [ ] Invoke CRM retry, **Reconcile open handoffs**, or **Sweep unfed
  transactions** only when each provider mutation is separately authorized.
  Confirm idempotency and record safe before/after counts.
- [ ] Inspect browser consent/`dataLayer` behavior and stored Server Analytics
  only. External analytics-provider delivery is unavailable/future work, not an
  authorized Tier 2 option; enabling a flag does not create a provider sender.

Stop immediately for an unexpected live CRM/analytics write, repeated webhook
processing, missing attempt identity, donor/payment data exposure, signature or
authentication bypass, or unexplained production readiness failure. Follow the
[backup/restore/rollback runbook](backup-restore-rollback.md) rather than
improvising destructive cleanup.

## Exit criteria

The rehearsal passes when Tier 1 is green, required browser checks were either
completed or explicitly recorded as not run, every observed failure has an
owner/follow-up, no unsafe data entered evidence or Git, and no unavailable
feature was represented as working. Tier 2 is not required for a safe local
release decision unless the release owner explicitly makes hosted/provider
behavior part of the gate.
