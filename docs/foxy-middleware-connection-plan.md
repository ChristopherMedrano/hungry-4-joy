# Foxy To Middleware Connection Plan

This plan explains how the current Foxy demo cart handoff connects to the Laravel middleware receiver, what is connected now, and what must happen before a real Foxy webhook is trusted.

## Current State

The WordPress campaign page sends one-time donation selections to the Foxy demo cart with safe metadata in the cart URL. The Laravel middleware accepts matching checkout event JSON at:

```text
POST /api/checkout/events
```

Those two pieces are contract-compatible, but Foxy is not yet configured to call Laravel directly.

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

Official references:

- [Foxy webhooks API relation](https://api.foxy.io/rels/webhooks)
- [Foxy JSON webhook announcement](https://foxy.io/blog/new-feature-json-webhook/)

Before turning on an actual Foxy webhook, add these pieces:

- Public HTTPS URL for the Laravel receiver, such as a deployed app URL or a temporary local tunnel.
- Foxy JSON webhook configured for transaction events.
- Signature verification using a local demo signing value first, then environment-managed provider secrets.
- A payload adapter if Foxy's native JSON payload differs from the normalized receiver contract.
- Tests for signature success, signature failure, payload adaptation, duplicate retry, and safe storage.
- Logging that records event IDs and statuses without storing raw provider payment payloads.

The planned webhook target remains:

```text
POST https://<public-middleware-host>/api/checkout/events
```

## Safety Boundary

Do not add or document real card values, CVV/CVC values, checkout credentials, API keys, access tokens, client secrets, raw provider payloads, or private donor notes.

Production webhook activation is blocked until signature verification and raw-payload handling are explicitly implemented and tested.
