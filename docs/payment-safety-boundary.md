# Checkout And Payment Safety Boundary

This document keeps the Hungry-4-Joy demo clear about which layer owns donation metadata, checkout behavior, simulated event data, and PCI-aware payment handling.

It is not a full PCI compliance program. The practical goal is to keep raw payment details and production checkout writes out of this repo while still modeling the safe data a donation workflow needs.

## Current Milestone Scope

The current repo connects one-time donation buttons to a Foxy demo cart handoff, verifies local checkout event fixtures through the Laravel middleware receiver, and implements a signed Foxy webhook receiver for adapted transaction events.

In scope:

- One-time donation button metadata.
- Foxy demo cart links and sidecart loader behavior.
- Safe cart fields such as name, price, code, quantity, and custom options.
- Opaque donation attempt identifiers such as `donation_attempt_id`.
- Simulated checkout event fixtures.
- Local Laravel fixture receiver validation, normalized storage, and duplicate prevention for safe fixture payloads at `POST /api/checkout/events`.
- Signed Foxy webhook receipt, signature verification, safe field adaptation, normalized storage, and duplicate prevention at `POST /api/foxy/webhooks`.
- Safe transaction identifiers, statuses, timestamps, campaign codes, amounts, and donor/contact fields.
- Local documentation and local reference payloads for receiver verification.

Out of scope:

- Production payment writes.
- Raw payment method collection.
- Subscription, recurring gift, or refund payloads.
- Storing real payment credentials, provider secrets, or webhook secrets in committed source files, docs, fixtures, logs, config examples, or database snapshots.
- Provider API calls, API keys, access tokens, authorization headers, or committed provider/webhook secrets.
- Production activation without environment-managed hosted secrets and provider test verification.

## System Ownership

### WordPress May Own

WordPress may render public campaign content and safe donation option metadata.

Allowed WordPress data:

- Campaign ID.
- Campaign name.
- Donation amount.
- Donation label.
- Donation type, currently `one_time`.
- Source page.
- Intended checkout provider name, currently `foxy`.
- Opaque `donation_attempt_id` generated at click time.
- Public labels and accessibility text.

WordPress must not collect, store, log, or submit raw payment details.

`donation_attempt_id` is safe public metadata only when it is opaque. It must not encode donor identity, private donor notes, card data, provider credentials, authorization data, or secrets.

### Checkout May Own

The hosted checkout provider may own cart, checkout, and payment collection behavior.

Checkout-owned responsibilities:

- Hosted cart or checkout UI.
- Payment method collection.
- Payment authorization and declines.
- Sensitive payment method handling.
- Producing safe checkout result events.

The WordPress demo cart handoff performs a safe demo cart request only. It does not perform a production checkout write, provider API write, webhook receiver action, or credentialed provider call.

### Laravel Receives Checkout Events

Laravel has two checkout event receivers:

- `POST /api/checkout/events` is the fixture/local receiver for project-owned demo and test payloads.
- `POST /api/foxy/webhooks` is the signed Foxy webhook route. It receives raw Foxy JSON transiently, verifies the `Foxy-Webhook-Signature` header with the configured webhook encryption key, adapts the payload into safe normalized fields, and stores only those safe fields.

Allowed Laravel event data:

- Event ID.
- Event type.
- Event timestamp.
- Checkout provider name.
- Checkout session ID.
- Transaction ID when one exists.
- Transaction status.
- Idempotency key.
- Donation attempt ID.
- Source page.
- Campaign metadata.
- Donation amount, currency, label, and type.
- Safe donor/contact fields such as name, email, and optional phone.
- Redacted failure code, message, and provider status for failed payments.

Laravel must not receive raw card data, CVV or CVC values, raw payment credentials, payment method secrets, checkout API keys, authorization headers, access tokens, or client secrets.

The signed Foxy webhook route may receive raw Foxy JSON only transiently for signature verification and adaptation. Laravel must not store, commit, or log unredacted raw provider payloads.

Hosted production activation may use environment-managed secrets, such as `FOXY_WEBHOOK_ENCRYPTION_KEY` in Render. Those secrets must remain outside committed source files, docs, fixtures, examples, and logs.

## Simulated Event Rules

Simulated events are local reference payloads only.

They should:

- Use fictional donor data.
- Match the checkout event contract in `docs/contracts.md`.
- Match campaign metadata used by `front-page.html`.
- Use safe demo transaction, session, and event IDs.
- Use opaque demo donation attempt IDs.
- Represent one-time donation success and failed payment states only.

They should not:

- Use real donor contact information.
- Include real provider payloads.
- Include secrets, tokens, authorization headers, or payment credentials.
- Trigger any provider API or production webhook action.
- Trigger any production write or hosted cart action.

## Do Not Include

The project must not include these values in markup, docs, JSON fixtures, logs, config, database records, commits, issues, or dashboards:

- Full card numbers.
- CVV or CVC values.
- Raw payment credentials.
- Payment method secrets.
- Checkout API keys.
- Authorization headers.
- Access tokens.
- Client secrets.
- Provider secrets.
- Webhook secrets.
- Real provider webhooks copied without redaction.
- Real donor payment data.

## Review Checklist

Before adding checkout-related code or docs, confirm:

- The change is safe demo cart handoff behavior, metadata-only modeling, simulated event data, or local receiver verification.
- The demo cart handoff uses only safe cart fields and public store URLs.
- WordPress owns only public content and safe metadata.
- Checkout owns payment collection and sensitive payment handling.
- Laravel receives fixture data at `/api/checkout/events` or signed Foxy webhook data at `/api/foxy/webhooks`, and stores only normalized safe fields.
- Raw Foxy JSON is used only transiently for webhook signature verification and adaptation.
- Fixture data is fictional and local.
- No production checkout write is introduced.
- No provider or webhook secrets appear in committed source files, docs, fixtures, examples, logs, or issue text.
- No forbidden data appears in files, examples, logs, or issue text.
