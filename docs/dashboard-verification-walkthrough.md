# Dashboard Verification Walkthrough

Use this walkthrough to verify the Hungry-4-Joy integration status dashboard without production checkout, live HubSpot, or analytics access.

It covers automated API checks, local fixture seeding, frontend lint/build commands, and browser inspection for success, failure, pending, duplicate-ingest exclusion, retryable CRM state, list-warning state, and CRM sync issues.

Related docs:

- Payload contract: [`docs/contracts.md`](contracts.md) — Section 5 Dashboard Status Payload
- Demo fixtures: [`examples/dashboard-status-demo/README.md`](../examples/dashboard-status-demo/README.md)
- Checkout fixtures (duplicate replay): [`examples/checkout-events/`](../examples/checkout-events/)
- Payment safety: [`docs/payment-safety-boundary.md`](payment-safety-boundary.md)
- Frontend README: [`dashboard/README.md`](../dashboard/README.md)

## What This Verifies

- Dashboard list and detail API routes return contract-shaped JSON from local data only.
- Demo seeder loads one row per transaction and CRM badge state.
- Duplicate checkout replays do not create extra dashboard rows.
- CRM sync issues lists CRM sync rows with failures, retries, retryable state, or list warnings from stored attempt data.
- Checkout attempt trace shows chronological integration steps for one `donation_attempt_id`.
- System status tab and header strip show middleware readiness from `GET /api/health/ready`.
- Frontend lint, typecheck, and production build succeed.
- Browser UI renders expected badges and detail callouts without payment or secret fields.

Production Foxy webhooks, live HubSpot, and hosted analytics are optional follow-up checks — not required for this walkthrough.

## 1. Run Automated Checks

From the repository root:

```bash
npm run test:dashboard
```

This runs:

1. Laravel dashboard API tests (`php artisan test --filter=Dashboard`)
2. Dashboard ESLint
3. Dashboard Vite production build

Run only the API acceptance bundle:

```bash
cd middleware-api
php artisan test --filter=Dashboard
```

Key test classes:

| Test class | Purpose |
| --- | --- |
| `DashboardEventApiTest` | List/detail payloads, filters, CRM summaries |
| `DashboardStatusDemoSeederTest` | Demo seeder badge matrix |
| `DashboardCrmSyncRetryTest` | Manual CRM retry endpoint |
| `DashboardVerificationTest` | Walkthrough acceptance checks (duplicate exclusion, safety fields, badge matrix) |
| `DashboardIntegrationStepApiTest` | Integration step log list and by-attempt `integration_steps` |
| `HealthReadyTest` | Readiness endpoint checks and secret exclusion |

## 2. Prepare Local API Data

```bash
cd middleware-api
composer install
php artisan migrate
php artisan dashboard:seed-status-demo
php artisan serve
```

The demo seeder ingests JSON from `examples/dashboard-status-demo/` and creates **8 checkout events** — one for each dashboard badge combination documented in [`examples/dashboard-status-demo/README.md`](../examples/dashboard-status-demo/README.md).

Re-running the seeder is idempotent: checkout rows are not duplicated; CRM attempt rows are refreshed.

Optional: also replay original checkout contract fixtures:

```bash
php artisan checkout:replay-fixtures
```

## 3. Start The Dashboard Frontend

In a second terminal:

```bash
cd dashboard
npm install
npm run dev
```

Open the URL Vite prints (for example `http://127.0.0.1:5173`).

View modes:

| Mode | Use for |
| --- | --- |
| **Seeded preview** | Offline UI check — no API required |
| **Local API (demo fixtures)** | Rows from local `php artisan serve` + demo seeder |
| **Hosted API (Render)** | Production-like hosted middleware (optional) |

For this walkthrough, use **Local API (demo fixtures)** after step 2.

## 4. Browser Inspection — System Status

Open the **System status** tab (first nav item). The header strip above the nav mirrors the same checks in compact badges.

Contract reference: readiness vocabulary in [`docs/contracts.md`](contracts.md) — Section 5 Health And Readiness Endpoints.

### Seeded preview

With **Seeded preview** selected:

- Header shows a preview hint instead of live checks.
- Tab shows static demo readiness (`degraded`: DB ok, Foxy webhook configured, hAPI not configured, HubSpot disabled).

### Local API

With **Local API (demo fixtures)** selected:

- Header badges and tab cards load from `GET /api/health/ready`.
- Expect `database` and `migrations` = OK after `php artisan migrate`.
- Foxy and HubSpot checks reflect your local middleware `.env` (often `degraded` until credentials are set).
- **Refresh** re-fetches readiness without reloading the page.

API check:

```bash
PORT=8001  # example — use your `php artisan serve` port

curl -sS "http://127.0.0.1:${PORT}/api/health/ready" | jq .
```

Liveness (Render probe) stays separate:

```bash
curl -sS "http://127.0.0.1:${PORT}/api/health" | jq .
```

## 5. Browser Inspection — Checkout Events Tab

Open **Checkout events** with **Local API (demo fixtures)** selected.

Confirm the list loads and the detail panel opens when you click each row. Use the search box with **donor email** or **donation attempt id**.

The checkout list is sorted **newest first** (`event_created_at` descending). Times in the UI follow your browser locale (for example **Jun 12, 06:00 AM** local when the fixture timestamp is **2026-06-12T10:00:00Z**).

### Row count

| Data source | Rows | When you have it |
| --- | --- | --- |
| `dashboard:seed-status-demo` only | **8** | Step 2 without `checkout:replay-fixtures` |
| Demo seeder + contract replay | **11** | Also ran `php artisan checkout:replay-fixtures` (or replayed fixtures manually) |

If you see **11 rows** like the screenshot below, the top **8** are the Jun 12 demo badge matrix; the bottom **3** are older May 27 contract fixtures from `examples/checkout-events/`.

### List order (newest first — as shown in the table)

Inspect top to bottom. Search each row by email and attempt id; confirm badges and detail callouts.

| List # | When (local example) | Donor | Attempt id | Transaction | CRM | Fixture |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Jun 12, 06:35 AM | `payment.failed@example.test` | `h4j_attempt_demo_status_payment_failed` | Failed | N/A | `payment-failed-donation.json` |
| 2 | Jun 12, 06:30 AM | `checkout.pending@example.test` | `h4j_attempt_demo_status_checkout_pending` | Pending | N/A | `checkout-pending-donation.json` |
| 3 | Jun 12, 06:25 AM | `retryable.donor@example.test` | `h4j_attempt_demo_status_retryable` | Completed | Retryable | `crm-retryable-donation.json` |
| 4 | Jun 12, 06:20 AM | `failed.donor@example.test` | `h4j_attempt_demo_status_failed` | Completed | Failed | `crm-failed-donation.json` |
| 5 | Jun 12, 06:15 AM | `crm.pending@example.test` | `h4j_attempt_demo_status_crm_pending` | Completed | Pending | `crm-pending-donation.json` |
| 6 | Jun 12, 06:10 AM | `warning.donor@example.test` | `h4j_attempt_demo_status_warning` | Completed | Warning | `crm-warning-donation.json` |
| 7 | Jun 12, 06:05 AM | `webhook.donor@example.test` | `h4j_attempt_demo_status_webhook` | Completed | Synced | `foxy-webhook-donation.json` |
| 8 | Jun 12, 06:00 AM | `synced.helper@example.test` | `h4j_attempt_demo_status_synced` | Completed | Synced | `synced-fixture-receiver.json` |
| 9 | May 27, 10:10 AM | `riley.pending@example.test` | `h4j_attempt_demo_loaves_0003` | Pending | N/A | `checkout-pending.one-time.json` |
| 10 | May 27, 10:08 AM | `casey.giver@example.test` | `h4j_attempt_demo_fish_0002` | Failed | N/A | `payment-failed.one-time.json` |
| 11 | May 27, 10:05 AM | `jordan.helper@example.test` | `h4j_attempt_demo_loaves_0001` | Completed | N/A | `donation-created.one-time.json` |

Rows 9–11 only appear after contract fixture replay. Jordan’s row may show **CRM N/A** until a CRM sync attempt exists for that checkout event.

### Detail callouts (Jun 12 demo rows)

| Donor email | Detail callout |
| --- | --- |
| `synced.helper@example.test` | Green synced callout; contact/deal ids |
| `webhook.donor@example.test` | Ingest channel `foxy_webhook` in detail |
| `warning.donor@example.test` | Amber warning; **Retry list enrollment** when eligible |
| `crm.pending@example.test` | Sky pending callout |
| `failed.donor@example.test` | Red failed callout; **Retry sync** when eligible |
| `retryable.donor@example.test` | Orange retryable callout; **Retry sync now** |
| `checkout.pending@example.test` | Gray CRM not applicable |
| `payment.failed@example.test` | Red checkout failed callout |

For a clean **8-row** list during walkthrough, run `php artisan migrate:fresh` then only `dashboard:seed-status-demo` (skip replay).

Contract reference: CRM badge derivation rules in [`docs/contracts.md`](contracts.md) — Section 5 CRM status summary.

## 6. Browser Inspection — CRM Sync Issues Tab

Open the **CRM sync issues** tab.

Expected:

- Rows for failed, retryable, and list-warning donations from the demo seeder.
- Rows link to checkout events by **donation attempt id**.
- Hint text describes how CRM sync issues are derived from stored CRM sync attempt fields.
- Each eligible row shows a context-aware **Retry** action (left of **View event**).
- Checkout event detail links to this tab via **Open in CRM sync issues** instead of inline retry.

Filter **CRM sync → retryable** on the checkout events tab and confirm the same retryable row appears in both places.

## 7. Browser Inspection — Checkout Attempts And Integration Timeline

Open the **Checkout attempts** tab.

Contract reference: integration step vocabulary in [`docs/contracts.md`](contracts.md) — Section 7 Integration Step Log.

### Seeded preview

With **Seeded preview** selected, open an attempt trace (for example `h4j_attempt_demo_unlinked_decline`).

Expected:

- **Integration timeline** lists steps in chronological order (oldest first).
- Decline fixture shows `handoff_registered` then `handoff_reconcile_attempted` with `foxy_transaction_not_found`.
- Step summaries are human-readable and omit secrets or payment data.

### Local API (after handoff or webhook activity)

When middleware has written `integration_step_logs` rows for an attempt:

```bash
curl -sS "http://127.0.0.1:${PORT}/api/dashboard/events/by-attempt/<donation_attempt_id>" | jq '.data.integration_steps'
```

Or query the step list directly:

```bash
curl -sS "http://127.0.0.1:${PORT}/api/dashboard/integration-events?donation_attempt_id=<donation_attempt_id>" | jq .
```

Expected for a completed synced donation:

- `foxy_webhook_received` or `checkout_event_ingested`
- `crm_sync_dispatched` and `crm_sync_completed` when HubSpot sync ran

The integration timeline on the attempt trace panel should match the API order. There is no top-level integration-events table in the dashboard MVP.

## 8. Duplicate Ingest Exclusion

Duplicate checkout replays return `duplicate_ignored` and **do not** appear as extra dashboard rows.

Automated check:

```bash
cd middleware-api
php artisan test --filter=DashboardVerificationTest
```

Manual API check from the **repository root** (set `PORT` to your `php artisan serve` port):

```bash
PORT=8002  # example — use the port Artisan printed

curl -s -X POST http://127.0.0.1:${PORT}/api/checkout/events \
  -H 'Content-Type: application/json' \
  -d @examples/checkout-events/donation-created.one-time.json

curl -s -X POST http://127.0.0.1:${PORT}/api/checkout/events \
  -H 'Content-Type: application/json' \
  -d @examples/checkout-events/donation-created.one-time.json

curl -s "http://127.0.0.1:${PORT}/api/dashboard/events" | jq '.meta.total'
```

Expected responses:

| Post | If Jordan row is **not** in DB yet | If already ingested (e.g. after `checkout:replay-fixtures`) |
| --- | --- | --- |
| First | `{"status":"accepted"}` (HTTP 202) | `{"status":"duplicate_ignored"}` (HTTP 200) |
| Second | `{"status":"duplicate_ignored"}` (HTTP 200) | `{"status":"duplicate_ignored"}` (HTTP 200) |

Either way, `.meta.total` must **not increase** on the second POST. With demo seeder + contract replay already loaded, expect total **11**, not 12.

## 9. Manual CRM Retry (Optional)

Requires **Local API** or **Hosted API** mode — not Seeded preview.

1. Select the retryable demo row (`retryable.donor@example.test`).
2. Click **Retry sync now** in the CRM detail section.
3. Confirm the button shows **Retrying…** and cannot be double-clicked.
4. Confirm CRM badge updates to **Synced** and list row refreshes.

List-warning retry follows the same pattern with **Retry list enrollment**.

## 10. Safety Checks

During browser inspection, confirm the UI does **not** show:

- Card numbers, CVV, or raw payment credentials
- API keys, bearer tokens, or webhook secrets
- Raw provider payloads

List responses omit HubSpot ids; detail responses include safe external references only. Automated scan: `DashboardVerificationTest::test_dashboard_list_and_detail_payloads_exclude_forbidden_payment_fields`.

## 11. Hosted Dashboard (Optional)

After Render Blueprint sync:

```text
https://hungry-4-joy-dashboard.onrender.com
```

Use **Live API** view mode. CRM sync issues and CRM retry require middleware redeploys from the same repository.

See [`docs/render-deployment.md`](render-deployment.md).

## 12. Hosted Handoff And Foxy Trace (Optional)

Use this after hosted WordPress + middleware deploy when verifying checkout handoff registration and Foxy reconciliation—not required for the local demo seeder walkthrough.

Related: [`docs/foxy-middleware-connection-plan.md`](foxy-middleware-connection-plan.md) Phase 1.5, [`docs/contracts.md`](contracts.md) Section 2 checkout handoff registration.

### Click → handoff

1. Open hosted campaign page and click a donation button.
2. Confirm browser POST to `POST /api/checkout/handoffs` returns **202** (network tab).
3. Note the `donation_attempt_id` in the Foxy cart item options or cart URL.

### By-attempt lookup

```bash
curl -sS "https://hungry-4-joy-middleware.onrender.com/api/dashboard/events/by-attempt/<donation_attempt_id>" | jq .
```

Expect at minimum a `handoff` block with `status: cart_handoff_created` and an `integration_steps` array when step logs exist for the attempt.

### After checkout — two expected outcomes

| Test | Foxy creates | By-attempt result |
| --- | --- | --- |
| Success or auth/incomplete shell | Transaction | `checkout_event` present (`donation.created` or `payment.failed`) |
| Authorize.net decline (ZIP `46282`) | Cart + error log only | `handoff` present; `checkout_event` null; `reconciliation.note` = `foxy_transaction_not_found` |

The decline case is **expected**. Foxy does not create a transaction for that sandbox decline path, so transaction reconcile cannot ingest `payment.failed`.

### By-cart lookup (decline / error-log path)

When Foxy admin shows a checkout error, copy the logged **`id`** (cart id):

```bash
curl -sS "https://hungry-4-joy-middleware.onrender.com/api/dashboard/events/by-cart/<foxy_cart_id>" | jq .
```

Expect:

- `donation_attempt_id` resolved from cart item options
- `foxy_cart.items[].donation_attempt_id` matching the click-time id
- `handoff` when the donor clicked from hosted WordPress before checkout
- `checkout_event: null` for gateway-decline cases with no Foxy transaction

Example verified cart id: `2247125087` → attempt `h4j_attempt_3cadaab7-a8f2-4e55-a664-513426c7b17e`.

## Quick Reference Commands

```bash
# Full dashboard verification bundle
npm run test:dashboard

# API only
cd middleware-api && php artisan test --filter=Dashboard

# Seed + serve + frontend
cd middleware-api && php artisan dashboard:seed-status-demo && php artisan serve
cd dashboard && npm run dev
```
