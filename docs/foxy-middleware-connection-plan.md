# Foxy To Middleware Connection Plan

This plan explains how the current Foxy demo cart handoff connects to the Laravel middleware receiver, what is connected now, and what must happen before a real Foxy webhook is trusted.

## Current State

The WordPress campaign page sends one-time donation selections to the Foxy demo cart with safe metadata in the cart URL. The Laravel middleware accepts matching checkout event JSON at:

```text
POST /api/checkout/events
```

The hosted demo services are live:

```text
WordPress: https://hungry-4-joy-wordpress.onrender.com
Middleware: https://hungry-4-joy-middleware.onrender.com
```

The fixture receiver and the Foxy cart links are contract-compatible. A dedicated Foxy webhook receiver is now planned at:

```text
POST /api/foxy/webhooks
```

That route verifies Foxy's webhook signature before adapting safe transaction fields into the existing normalized checkout event contract.

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
Foxy-shaped fixture event -> Laravel receiver route -> validation -> checkout_events storage -> duplicate handling
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

Before turning on an actual Foxy webhook, add these pieces:

- Public HTTPS URL for the Laravel receiver.
- Foxy JSON webhook configured for transaction events.
- `FOXY_WEBHOOK_ENCRYPTION_KEY` stored as an environment-managed secret.
- Signature verification using Foxy's `Foxy-Webhook-Signature` header.
- Payload adapter for safe transaction fields from Foxy's native JSON payload.
- Tests for signature success, signature failure, payload adaptation, duplicate retry, and safe storage.
- Logging that records event IDs and statuses without storing raw provider payment payloads.

The planned webhook target is:

```text
POST https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
```

Recommended Foxy setup:

```text
URL: https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
Format: JSON
Resource: transaction
Event: created
Query: zoom=items,items:options
Encryption key: generated in Foxy and copied to FOXY_WEBHOOK_ENCRYPTION_KEY
```

The existing fixture endpoint remains available for project-owned demos:

```text
POST https://hungry-4-joy-middleware.onrender.com/api/checkout/events
```

Manual Foxy webhook replays may arrive with `Foxy-Webhook-Event: transaction/refeed`. The middleware treats those as signed replays of the original `transaction/created` donation and should return `duplicate_ignored` when the transaction was already stored.

## Safety Boundary

Do not add or document real card values, CVV/CVC values, checkout credentials, API keys, access tokens, client secrets, raw provider payloads, or private donor notes.

Production webhook activation is blocked until signature verification is configured in Render and a real Foxy test event has confirmed the payload adapter receives the expected item options.
