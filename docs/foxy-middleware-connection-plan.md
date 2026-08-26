# Foxy To Middleware Connection Plan

This plan explains how the current Foxy demo cart handoff connects to the Laravel middleware receiver, what is connected now, and what must happen before a real Foxy webhook is trusted.

## Current State

The WordPress campaign page sends one-time donation selections to the Foxy demo cart with safe metadata in the cart URL. At click time, the theme script appends an opaque `donation_attempt_id` item option so the browser click can be reconciled with later checkout events. The Laravel middleware accepts matching checkout event JSON at:

```text
POST /api/checkout/events
```

The hosted demo services are live:

```text
WordPress: https://hungry-4-joy-wordpress.onrender.com
Middleware: https://hungry-4-joy-middleware.onrender.com
```

The fixture receiver and the Foxy cart links are contract-compatible. A dedicated Foxy webhook receiver is implemented for local and signed webhook handling at:

```text
POST /api/foxy/webhooks
```

That route verifies Foxy's webhook signature before adapting safe transaction fields into the existing normalized checkout event contract. The hosted Foxy JSON webhook is **active** on Render as of June 2026: signed `transaction/created` events store normalized rows with `ingest.channel = foxy_webhook` and appear in the dashboard API.

## Phase 1: Local Demo Event Replay

Use the tracked checkout event fixtures as the local demo event source:

```text
examples/checkout-events/donation-created.one-time.json
examples/checkout-events/payment-failed.one-time.json
```

Replay them into the Laravel receiver with:

```bash
npm run connect:foxy-demo
```

Or from inside the middleware app:

```bash
php artisan checkout:replay-fixtures
```

This command keeps the connection project-owned and public-safe:

- It reads only tracked fixture JSON.
- It submits each fixture through the existing Laravel API route.
- It expects `202 Accepted` for new events.
- It accepts `200 OK` with `duplicate_ignored` for repeated events.
- It does not call Foxy, HubSpot, analytics, dashboard services, or production checkout APIs.
- It does not require provider secrets.

Use this phase to prove the end-to-end local path:

```text
Foxy-shaped fixture event with donation_attempt_id -> Laravel receiver route -> validation -> checkout_events storage -> duplicate handling
```

Expected output shape with fresh local storage:

```text
donation-created.one-time.json: accepted
payment-failed.one-time.json: accepted
```

When events already exist locally, repeated replay should return:

```text
donation-created.one-time.json: duplicate_ignored
payment-failed.one-time.json: duplicate_ignored
```

## Phase 1.5: Browser Handoff Registration And Foxy Reconciliation

The WordPress theme registers checkout handoffs at click time without writing to the WordPress database:

```text
POST /api/checkout/handoffs
```

Hosted WordPress receives `MIDDLEWARE_API_URL` from Render (wired to the middleware service URL). The middleware CORS allowlist includes the hosted WordPress origin so the browser can POST safely.

After registration, Laravel attempts immediate reconciliation. Operators can reconcile on demand, and hosts can opt into the backoff schedule:

```bash
php artisan checkout:reconcile-handoffs
```

The schedule is disabled by default. `CHECKOUT_HANDOFF_SCHEDULED_RECONCILE=true` registers the command with Laravel's every-minute schedule, but a host must separately invoke `php artisan schedule:run` every minute (or run Laravel's scheduler worker). The checked-in `render.yaml` does not configure a cron job or scheduler worker; hosted demo verification uses the dashboard batch actions or manual command unless that infrastructure is added explicitly.

Foxy hAPI reconciliation requires OAuth credentials stored only in environment configuration:

| Key | Purpose |
| --- | --- |
| `FOXY_CLIENT_ID` | Foxy OAuth client id |
| `FOXY_CLIENT_SECRET` | Foxy OAuth client secret |
| `FOXY_REFRESH_TOKEN` | Long-lived refresh token for hAPI access |
| `FOXY_STORE_ID` | Foxy store id (for example `120139`) |

Reconciliation lookup filter (transactions only):

```text
GET /stores/{store_id}/transactions?items:item_options:name[donation_attempt_id]={attempt_id}&zoom=items,items:item_options,payments,custom_fields
```

All hAPI requests must send `FOXY-API-VERSION: 1`.

#### What reconcile can and cannot ingest

Reconcile is **transaction-scoped**. That matches how Foxy exposes checkout outcomes in hAPI.

| Foxy outcome (Authorize.net sandbox) | Foxy record | Reconcile result |
| --- | --- | --- |
| Completed checkout (including empty `status`, whether `data_is_fed` is true or false) | **Transaction** | Ingests `donation.created` with `transaction_status=completed`; links handoff |
| Explicit `declined`, `rejected`, or `failed` transaction status | **Transaction** | Ingests `payment.failed`; links handoff |
| Unrecognized non-empty transaction status | **Transaction** | Fails closed to `payment.failed`; links handoff |
| Gateway card decline (billing ZIP `46282`) | **Cart + error log only** — no transaction | `foxy_transaction_not_found`; handoff stays visible |

An empty Foxy transaction status is a completed transaction in the verified flow. `data_is_fed` tracks feed/delivery state, not payment outcome; the unfed sweep uses it only to find transactions that may need ingestion. Known explicit failure statuses (`declined`, `rejected`, and `failed`) become `payment.failed`. The mapper also treats any unrecognized non-empty status as `payment.failed` so an unknown provider outcome cannot be recorded as a completed donation.

Gateway declines do **not** create a transaction in Foxy during hosted testing, so reconcile cannot produce a `payment.failed` checkout event for that path. That is Foxy/gateway behavior, not a missing webhook or broken handoff.

#### Support lookup by Foxy cart id (intended for declines)

Foxy admin checkout error logs use the **cart id** as `id`. Middleware resolves attempt identity from the cart:

```text
GET /api/dashboard/events/by-cart/{foxy_cart_id}
```

Implementation: Foxy hAPI `GET /carts/{id}?zoom=items,items:item_options` → read `donation_attempt_id` item option → join `checkout_handoffs` / `checkout_events`.

Use this when you have an error-log id (for example `2247125087`) and by-attempt reconcile shows `foxy_transaction_not_found`.

`fcsid` (browser session) is not a supported hAPI lookup key; cart id is.

#### Verification commands

These operator routes require the bearer token. Use the unlocked dashboard so the token stays out of shell history, process arguments, URLs, and captured output.

Completed transaction (reconcile path):

Use the unlocked attempt lookup. Expect handoff + `checkout_event` `donation.created`; an empty Foxy status maps to completed.

Gateway decline (cart-only path):

After the Authorize.net decline test (ZIP `46282`), copy the cart id from the Foxy error log and use the unlocked cart lookup. Expect `donation_attempt_id` + handoff, `checkout_event` null, and Foxy cart items with metadata.

On-demand reconcile:

Use the unlocked dashboard's reconcile action for the attempt.

## Phase 2: Actual Foxy Webhook Connection

Foxy's webhook API supports JSON webhooks that push data to an endpoint. The Foxy webhook resource includes fields such as `format`, `url`, `query`, `encryption_key`, `event_resource`, and `is_active`. Foxy's docs note that JSON webhook configuration requires an `encryption_key`, and that key is also used for payload signature integrity.

Foxy sends JSON webhook metadata in request headers, including:

```text
Foxy-Webhook-Event
Foxy-Webhook-Signature
```

The signature is an HMAC-SHA256 hex digest of the raw request body using the webhook encryption key.

Official references:

- [Foxy webhooks API relation](https://api.foxy.io/rels/webhooks)
- [Foxy JSON webhook announcement](https://foxy.io/blog/new-feature-json-webhook/)

### Activation checklist

Use this checklist when turning on or re-verifying the hosted webhook:

- Public HTTPS URL for the Laravel receiver.
- Foxy JSON webhook configured for transaction events.
- Local/test signature verification using Foxy's `Foxy-Webhook-Signature` header passes with a non-production test webhook encryption key.
- Hosted Render configuration stores `FOXY_WEBHOOK_ENCRYPTION_KEY` as an environment-managed secret (never commit the key).
- Hosted provider-test signature verification passes against the Render environment without copying production secrets into local files or docs.
- The implemented payload adapter receives the expected safe transaction fields and item options from a real Foxy JSON payload.
- Existing tests for signature success, signature failure, payload adaptation, duplicate retry, and safe storage pass locally with test configuration and in hosted verification with Render-managed environment configuration.
- Logging that records event IDs and statuses without storing raw provider payment payloads.

The hosted webhook target is:

```text
POST https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
```

Recommended Foxy setup:

```text
URL: https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
Format: JSON
Resource: transaction
Event: created
Query: zoom=items,items:item_options
Encryption key: generated in Foxy and stored in Render as FOXY_WEBHOOK_ENCRYPTION_KEY
```

Foxy item options should include `donation_attempt_id`, so the webhook query must use `zoom=items,items:item_options` to include item options for the adapter. The Laravel `FoxyWebhookAdapter` preserves that option as the canonical attempt identity. For older or manual payloads that do not include the item option, the adapter falls back to `h4j_attempt_foxy_transaction_<transaction-id>`.

The existing fixture endpoint remains available for local/test project-owned demos and intentionally returns `404` in production:

```text
POST /api/checkout/events
```

Manual Foxy webhook replays may arrive with `Foxy-Webhook-Event: transaction/refeed`. The middleware treats those as signed replays of the original `transaction/created` donation and preserves the same `donation_attempt_id`. An ordinary replay of an already-correct row returns `duplicate_ignored`. A replay of the same transaction with an empty status returns `corrected` only when the existing row has the legacy `payment.failed` / `failed` / `failure_provider_status=incomplete` signature; that remediation converts it to `donation.created` / `completed`, clears failure fields, replaces stale failure analytics, and records an integration correction step.

### Hosted verification (active)

After activation, confirm the live path with these checks:

```bash
# Middleware health
curl https://hungry-4-joy-middleware.onrender.com/api/health

# Unsigned probe should be rejected (proves signature verification is enabled)
curl -sS -X POST https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks \
  -H 'Content-Type: application/json' \
  -H 'Foxy-Webhook-Event: transaction/created' \
  -d '{"id":1}'
# Expected: {"status":"signature_invalid",...}

# Fixture receiver stays disabled in production
curl -sS -o /dev/null -w '%{http_code}\n' -X POST \
  https://hungry-4-joy-middleware.onrender.com/api/checkout/events
# Expected: 404

# The unlocked dashboard list should include foxy_webhook rows
```

Complete a Foxy test transaction from the hosted WordPress demo cart (`https://hungry-4-joy-wordpress.onrender.com`). Then confirm:

- One new `checkout_events` row with `event_id` prefixed `foxy_transaction_`.
- `ingest.channel = foxy_webhook` in `/api/dashboard/events`.
- `donation_attempt_id` present (opaque value from cart item options when `zoom=items,items:item_options` is configured, or fallback `h4j_attempt_foxy_transaction_<transaction-id>`).
- Only normalized safe fields stored; no raw provider payload retention.

Duplicate handling:

- Re-post the same signed payload or use Foxy's webhook **refeed** for an existing transaction.
- Expected response for an already-correct row: `200 OK` with `{"status":"duplicate_ignored",...}`.
- Expected response for a qualifying legacy empty-status failure: `200 OK` with `{"status":"corrected",...}`; confirm the row is now `donation.created` / `completed` and its failure fields are null.
- No extra `checkout_events` rows and no duplicate CRM sync dispatches for the same `event_id`.
- Local coverage: `cd middleware-api && php artisan test --filter=FoxyWebhook`.

### Rollback and disable

To stop live Foxy ingest without redeploying code:

1. In the Foxy practice portal, deactivate or delete the JSON webhook pointing at `https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks`.
2. Optional: remove or rotate `FOXY_WEBHOOK_ENCRYPTION_KEY` in the Render middleware environment so any stray deliveries fail signature verification (`signature_invalid`).
3. Redeploy or restart the middleware service after env changes so the new key state is loaded.
4. Confirm new Foxy checkouts no longer create `foxy_webhook` rows in `/api/dashboard/events`.
5. Re-enable later by generating a new Foxy encryption key, setting it in Render, updating the Foxy webhook URL/settings, and re-running the hosted verification steps above.

The fixture receiver at `POST /api/checkout/events` remains available for local/test replay only.

## Safety Boundary

Do not add or document real card values, CVV/CVC values, checkout credentials, API keys, access tokens, client secrets, raw provider payloads, or private donor notes. `donation_attempt_id` is safe only while opaque and must not encode donor identity, authorization data, or provider credentials.

Do not store webhook encryption keys in committed source, docs, fixtures, or logs. Rotate the Foxy key and update Render if a secret is ever exposed.
