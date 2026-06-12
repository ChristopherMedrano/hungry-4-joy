# Simulated Checkout Event Examples

These local fixtures model safe checkout events for the Hungry-4-Joy checkout contract.

They are local reference and test payloads. They can be posted to the local Laravel receiver, but they do not call a hosted cart, create a checkout session, collect payment details, or write production data.

The full checkout and payment safety boundary is documented in [`../../docs/payment-safety-boundary.md`](../../docs/payment-safety-boundary.md).

## Files

| File | Event Type | Purpose |
| --- | --- | --- |
| `donation-created.one-time.json` | `donation.created` | Successful one-time donation event. |
| `checkout-pending.one-time.json` | `donation.created` | In-progress checkout with `transaction_status: pending`. |
| `payment-failed.one-time.json` | `payment.failed` | Failed one-time checkout or payment event. |

## Scope

The current fixture set only models one-time donation buttons. Recurring gift, subscription, and refund examples are intentionally deferred until the public site and checkout contract support those flows.

## Required Safe Fields

Each fixture should include the safe checkout envelope, campaign, donation, donor/contact, and status fields defined in [`../../docs/contracts.md`](../../docs/contracts.md).

Required attempt identity:

- `donation_attempt_id`: opaque project-owned checkout attempt identifier.

## Safety Rules

- Use fictional donor data.
- Keep campaign attribution aligned with [`../../docs/contracts.md`](../../docs/contracts.md) and `front-page.html`.
- Keep `donation_attempt_id` opaque; do not encode donor identity, private notes, card data, provider credentials, or authorization data.
- Do not include full card numbers, CVV or CVC values, raw payment credentials, checkout API keys, access tokens, client secrets, or unredacted provider payloads.
