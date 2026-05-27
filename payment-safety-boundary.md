# Checkout And Payment Safety Boundary

This document defines the payment safety boundary for the Hungry-4-Joy educational prototype.

The goal is to keep the project useful for checkout, webhook, CRM, analytics, and support practice without turning the repo into a place that handles sensitive payment data or production checkout writes.

## Current MVP Scope

MVP 2 models checkout metadata and checkout event payloads only.

In scope:

- One-time donation button metadata.
- Modeled checkout handoff shapes.
- Simulated checkout event fixtures.
- Safe transaction identifiers, statuses, timestamps, campaign codes, amounts, and donor/contact fields.
- Local documentation and local reference payloads for future middleware work.

Out of scope:

- Live hosted cart requests.
- Real checkout session creation.
- Production payment writes.
- Raw payment method collection.
- Subscription, recurring gift, or refund payloads.
- Storing real payment credentials or provider secrets.

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
- Public labels and accessibility text.

WordPress must not collect, store, log, or submit raw payment details.

### Checkout May Own

The hosted checkout provider may own cart, checkout, and payment collection behavior.

Checkout-owned responsibilities:

- Hosted cart or checkout UI.
- Payment method collection.
- Payment authorization and declines.
- Sensitive payment method handling.
- Producing safe checkout result events.

For MVP 2, the repo only models a future checkout handoff. It does not perform a hosted cart request or production checkout write.

### Laravel May Receive Later

Future Laravel middleware may receive safe checkout event data after checkout activity.

Allowed Laravel event data:

- Event ID.
- Event type.
- Event timestamp.
- Checkout provider name.
- Checkout session ID.
- Transaction ID when one exists.
- Transaction status.
- Idempotency key.
- Source page.
- Campaign metadata.
- Donation amount, currency, label, and type.
- Safe donor/contact fields such as name, email, and optional phone.
- Redacted failure code, message, and provider status for failed payments.

Laravel must not receive raw card data, CVV or CVC values, raw payment credentials, payment method secrets, checkout API keys, authorization headers, access tokens, client secrets, or unredacted provider payloads.

## Simulated Event Rules

Simulated events are local reference payloads only.

They should:

- Use fictional donor data.
- Match the checkout event contract in `contracts.md`.
- Match campaign metadata used by `front-page.html`.
- Use safe demo transaction, session, and event IDs.
- Represent one-time donation success and failed payment states only.

They should not:

- Use real donor contact information.
- Include real provider payloads.
- Include secrets, tokens, authorization headers, or payment credentials.
- Imply that checkout is connected.
- Trigger any production write or hosted cart action.

## Forbidden Data

The project must not include these values in markup, docs, JSON fixtures, logs, config, database records, commits, issues, or dashboards:

- Full card numbers.
- CVV or CVC values.
- Raw payment credentials.
- Payment method secrets.
- Checkout API keys.
- Authorization headers.
- Access tokens.
- Client secrets.
- Real provider webhooks copied without redaction.
- Real donor payment data.

## Review Checklist

Before adding checkout-related code or docs, confirm:

- The change is metadata-only or simulated unless a later issue explicitly wires checkout.
- WordPress owns only public content and safe metadata.
- Checkout owns payment collection and sensitive payment handling.
- Laravel receives only safe event data.
- Fixture data is fictional and local.
- No production checkout write is introduced.
- No forbidden data appears in files, examples, logs, or issue text.
