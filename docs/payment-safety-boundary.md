# Checkout And Payment Safety Boundary

This document keeps the Hungry-4-Joy demo clear about which layer owns donation metadata, checkout behavior, simulated event data, and PCI-aware payment handling.

It is not a full PCI compliance program. The practical goal is to keep raw payment details and production checkout writes out of this repo while still modeling the safe data a donation workflow needs.

## Current Milestone Scope

MVP 3 issue #55 connects one-time donation buttons to a Foxy demo cart handoff after Milestone 2 modeled checkout metadata and checkout event payloads.

In scope:

- One-time donation button metadata.
- Foxy demo cart links and sidecart loader behavior.
- Safe cart fields such as name, price, code, quantity, and custom options.
- Simulated checkout event fixtures.
- Safe transaction identifiers, statuses, timestamps, campaign codes, amounts, and donor/contact fields.
- Local documentation and local reference payloads for future middleware work.

Out of scope:

- Production payment writes.
- Raw payment method collection.
- Subscription, recurring gift, or refund payloads.
- Storing real payment credentials or provider secrets.
- Provider API calls, API keys, access tokens, authorization headers, or webhook secrets.

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

For issue #55, the repo performs a safe demo cart request only. It does not perform a production checkout write, provider API write, webhook receiver action, or credentialed provider call.

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
- Match the checkout event contract in `docs/contracts.md`.
- Match campaign metadata used by `front-page.html`.
- Use safe demo transaction, session, and event IDs.
- Represent one-time donation success and failed payment states only.

They should not:

- Use real donor contact information.
- Include real provider payloads.
- Include secrets, tokens, authorization headers, or payment credentials.
- Imply that a checkout event receiver is connected.
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
- Real provider webhooks copied without redaction.
- Real donor payment data.

## Review Checklist

Before adding checkout-related code or docs, confirm:

- The change is either safe demo cart handoff behavior, metadata-only modeling, or simulated event data.
- The issue #55 demo cart handoff uses only safe cart fields and public store URLs.
- WordPress owns only public content and safe metadata.
- Checkout owns payment collection and sensitive payment handling.
- Laravel receives only safe event data.
- Fixture data is fictional and local.
- No production checkout write is introduced.
- No forbidden data appears in files, examples, logs, or issue text.
