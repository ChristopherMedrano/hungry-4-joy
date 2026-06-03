# Middleware Receiver Verification

Use this walkthrough to verify the local Laravel checkout event receiver after changing receiver validation, storage, duplicate handling, fixtures, or payment-safety docs.

This walkthrough covers two middleware/API routes:

- `/api/checkout/events` is the local fixture receiver for project-owned checkout event JSON.
- `/api/foxy/webhooks` is the signed Foxy webhook route, implemented for local/signed webhook verification and adaptation into the same normalized checkout event contract.

Production Foxy webhook activation is still gated by environment configuration and hosted provider setup. The middleware does not call Foxy, sync CRM data, emit analytics, create observability events, or power dashboard views yet.

## What This Verifies

- Local Laravel setup, migrations, routes, and receiver tests.
- Successful fixture submission for tracked checkout event fixtures.
- Validation errors for malformed, unsupported, or unsafe payloads.
- Duplicate-event behavior for repeated `event_id` or `idempotency_key` values.
- Safe normalized storage without raw payment details or provider secrets.

## 1. Prepare The Local Middleware App

Install dependencies from the repository root if they are not already present:

```bash
cd middleware-api
composer install
```

Create local environment config only when `.env` is missing:

```bash
if [ ! -f .env ]; then
  cp .env.example .env
  php artisan key:generate
fi
```

Run migrations for the local middleware database:

```bash
php artisan migrate
```

Confirm the API routes are registered:

```bash
php artisan route:list --path=api
```

Expected routes include:

```text
GET|HEAD  api/health
POST      api/checkout/events
POST      api/foxy/webhooks
```

## 2. Run Receiver Tests

Run the fixture-based receiver tests:

```bash
php artisan test --filter=CheckoutEventFixtureReceiverTest
```

This verifies every tracked JSON fixture in `examples/checkout-events/*.json` posts successfully to `/api/checkout/events`, stores one safe normalized `checkout_events` row, and is ignored on retry.

Run the route behavior tests:

```bash
php artisan test --filter=CheckoutEventReceiverRouteTest
```

This verifies:

- `donation.created` fixtures return `202 Accepted`.
- `payment.failed` fixtures return `202 Accepted` when safe failure details are present.
- Missing required fields return `422 Unprocessable Content`.
- Unsupported `event_type` values return `422 Unprocessable Content`.
- Failed payment events without a `failure` object return `422 Unprocessable Content`.
- Forbidden payment or secret fields return `422 Unprocessable Content`.
- Duplicate `event_id` or `idempotency_key` values return `200 OK` with `duplicate_ignored`.

The repo-level shortcut for fixture tests is:

```bash
npm run test:fixtures
```

The repo-level middleware test command is:

```bash
npm run test:middleware
```

Replay the tracked Foxy-shaped fixtures through the local receiver route:

```bash
npm run connect:foxy-demo
```

Expected first replay output with fresh local storage:

```text
donation-created.one-time.json: accepted
payment-failed.one-time.json: accepted
```

Expected repeated replay output when events already exist locally:

```text
donation-created.one-time.json: duplicate_ignored
payment-failed.one-time.json: duplicate_ignored
```

## 3. Submit The Tracked Fixtures Manually

Start the local Laravel server:

```bash
php artisan serve
```

Use the URL printed by Artisan in a second terminal. The examples below assume `http://127.0.0.1:8000`; adjust the port if Artisan prints another one.

Health check:

```bash
curl -i http://127.0.0.1:8000/api/health
```

Expected response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "ok"
}
```

Submit the successful donation fixture:

```bash
curl -i \
  -H 'Content-Type: application/json' \
  --data-binary @../examples/checkout-events/donation-created.one-time.json \
  http://127.0.0.1:8000/api/checkout/events
```

Expected status and body:

```text
HTTP/1.1 202 Accepted
```

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "accepted"
}
```

Submit the failed payment fixture:

```bash
curl -i \
  -H 'Content-Type: application/json' \
  --data-binary @../examples/checkout-events/payment-failed.one-time.json \
  http://127.0.0.1:8000/api/checkout/events
```

Expected status and body are also `202 Accepted` with `status: accepted`.

Replay either fixture by running the same `curl` command again.

Expected duplicate response:

```text
HTTP/1.1 200 OK
```

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "duplicate_ignored"
}
```

## 4. Verify Validation Errors

Submit a malformed success event by removing a required field:

```bash
jq 'del(.campaign.campaign_id)' ../examples/checkout-events/donation-created.one-time.json \
  | curl -i \
      -H 'Content-Type: application/json' \
      --data-binary @- \
      http://127.0.0.1:8000/api/checkout/events
```

Expected result:

- `422 Unprocessable Content`.
- A JSON validation response containing `campaign.campaign_id`.
- No new `checkout_events` row for that rejected payload.

Submit an unsupported event type:

```bash
jq '.event_type = "subscription.created"' ../examples/checkout-events/donation-created.one-time.json \
  | curl -i \
      -H 'Content-Type: application/json' \
      --data-binary @- \
      http://127.0.0.1:8000/api/checkout/events
```

Expected result:

- `422 Unprocessable Content`.
- A JSON validation response containing `event_type`.
- No subscription, recurring, or refund behavior is triggered.

Submit a payload with forbidden payment fields:

```bash
jq '.card_number = "forbidden-demo-value" | .client_secret = "forbidden-demo-value"' ../examples/checkout-events/donation-created.one-time.json \
  | curl -i \
      -H 'Content-Type: application/json' \
      --data-binary @- \
      http://127.0.0.1:8000/api/checkout/events
```

Expected result:

- `422 Unprocessable Content`.
- A JSON validation response containing `card_number` and `client_secret`.
- No raw card details, payment credentials, provider tokens, or API secrets are accepted.

## 5. Check Stored Rows

Inspect the latest safe normalized row:

```bash
php artisan tinker --execute='dump(App\Models\CheckoutEvent::query()->latest()->first()?->only(["event_id", "event_type", "checkout_provider", "transaction_status", "campaign_id", "donation_amount", "donation_currency", "donor_email", "failure_code", "failure_provider_status"]));'
```

Expected stored fields include normalized event, transaction, campaign, donation, donor/contact, and redacted failure values. The database row should not include raw provider payloads or payment credentials.

Confirm duplicate replay did not create extra rows for a fixture event:

```bash
php artisan tinker --execute='dump(App\Models\CheckoutEvent::query()->where("event_id", "evt_h4j_demo_20260527_0001")->count());'
```

Expected result after replaying `donation-created.one-time.json`:

```text
1
```

## 6. Run Safety Checks

Validate fixture JSON:

```bash
jq empty ../examples/checkout-events/*.json
```

Scan fixtures, local logs, and local sqlite storage for forbidden payment or secret field names:

```bash
rg -n 'card_number|cvv|cvc|api_key|authorization|access_token|client_secret|payment_credential|payment_method_secret|raw_payment' ../examples/checkout-events storage/logs || true
test -f database/database.sqlite && strings database/database.sqlite | rg -n 'card_number|cvv|cvc|api_key|authorization|access_token|client_secret|payment_credential|payment_method_secret|raw_payment' || true
```

Expected result:

- No matches in checkout event JSON fixtures.
- No stored raw payment fields or provider secrets in local logs or sqlite storage.
- Documentation and tests may mention forbidden field names only as safety-boundary examples.

Do not paste real card values, checkout credentials, API keys, authorization headers, access tokens, client secrets, or unredacted provider payloads into fixtures, manual `curl` commands, logs, docs, commits, or issue comments.
