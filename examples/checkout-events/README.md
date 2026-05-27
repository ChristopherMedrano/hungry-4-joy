# Simulated Checkout Event Examples

These local fixtures model safe checkout events for the Hungry-4-Joy MVP 2 checkout contract.

They are reference payloads only. They do not call a hosted cart, create a checkout session, collect payment details, or write production data.

## Files

| File | Event Type | Purpose |
| --- | --- | --- |
| `donation-created.one-time.json` | `donation.created` | Successful one-time donation event. |
| `payment-failed.one-time.json` | `payment.failed` | Failed one-time checkout or payment event. |

## Scope

The current MVP only models one-time donation buttons. Recurring gift, subscription, and refund examples are intentionally deferred until the public site and checkout contract support those flows.

## Safety Rules

- Use fictional donor data.
- Keep campaign attribution aligned with `contracts.md` and `front-page.html`.
- Do not include full card numbers, CVV or CVC values, raw payment credentials, checkout API keys, access tokens, client secrets, or unredacted provider payloads.
