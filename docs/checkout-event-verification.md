# Checkout Event Verification Walkthrough

This walkthrough reviews the Hungry-4-Joy checkout event model and Foxy demo cart handoff before Laravel receiver work begins.

Use it when changing donation button metadata, checkout handoff docs, simulated checkout event fixtures, or the checkout/payment boundary.

## What This Verifies

- Donation buttons expose the expected campaign metadata.
- Button metadata maps cleanly into the Foxy demo cart handoff.
- Foxy demo cart links preserve safe metadata.
- Simulated checkout event fixtures match the checkout event contract.
- Sensitive payment details stay out of markup, docs, and fixture payloads.
- Middleware, CRM, analytics, and dashboard work remain future milestones.

## 1. Start With Campaign Page Metadata

Open the campaign template:

```text
wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Each `.h4j-donation-button` should include these attributes:

```text
data-campaign-id
data-campaign-name
data-donation-amount
data-donation-label
data-donation-type
data-source-page
data-checkout-provider
```

Useful source-inspection checks:

```bash
rg -c 'class="h4j-donation-button"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-donation-type="one_time"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-checkout-provider="foxy"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Expected result for the current page:

```text
6
6
6
```

Then confirm campaign IDs, amounts, labels, and visible text still line up:

```bash
rg -n 'data-campaign-id|data-donation-amount|data-donation-label|data-donation-type|data-checkout-provider' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Current campaign IDs:

- `loaves-campaign-01`
- `fish-campaign-02`

## 2. Review The Foxy Demo Cart Handoff

Open the handoff model in:

```text
docs/contracts.md
```

Review the `Foxy Demo Cart Handoff` section.

The important mapping is:

| Button Metadata | Internal Handoff Field | Foxy Cart Field |
| --- | --- | --- |
| `data-campaign-id` | `campaign.id` | `code` |
| `data-campaign-name` | `campaign.name` | `name` and `campaign_name` option |
| `data-donation-amount` | `donation.amount` | `price` |
| `data-donation-label` | `donation.label` | `donation_label` option |
| `data-donation-type` | `donation.type` | `donation_type` option |
| `data-source-page` | `source.page` | `source_page` option |
| `data-checkout-provider` | `checkout.provider` | `checkout_provider` option |

The demo cart handoff should remain limited to one-time donation buttons. It should not add:

- Production writes.
- Secrets, tokens, or payment credentials.
- Subscription or refund behavior.

Useful source-inspection checks:

```bash
rg -c 'href="https://hungry-4-joy.foxycart.com/cart' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'class="h4j-donation-button foxycart"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -n 'https://hungry-4-joy.foxycart.com/cart' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Expected result for the count checks:

```text
6
6
```

Manual browser check:

- Open the local campaign page.
- Click each donation option.
- Confirm Foxy's sidecart or full-page cart shows the selected campaign name, amount, campaign code, and safe custom options.
- Do not enter real payment data.

## 3. Review Simulated Checkout Events

Open the fixture directory:

```text
examples/checkout-events/
```

Current fixture files:

- [`donation-created.one-time.json`](../examples/checkout-events/donation-created.one-time.json)
- [`payment-failed.one-time.json`](../examples/checkout-events/payment-failed.one-time.json)

Validate the JSON:

```bash
jq empty examples/checkout-events/*.json
```

Print a readable summary of each fixture:

```bash
jq -r '
  "File: \(input_filename)",
  "Event: \(.event_type)",
  "Status: \(.transaction_status)",
  "Campaign: \(.campaign.campaign_id)",
  "Donation: $\(.donation.amount) - \(.donation.donation_label) - \(.donation.donation_type)",
  "Transaction: \(.transaction_id // "none")",
  ""
' examples/checkout-events/*.json
```

Expected summary shape:

```text
File: examples/checkout-events/donation-created.one-time.json
Event: donation.created
Status: completed
Campaign: loaves-campaign-01
Donation: $25 - 3 loaves - one_time
Transaction: txn_demo_loaves_1042

File: examples/checkout-events/payment-failed.one-time.json
Event: payment.failed
Status: failed
Campaign: fish-campaign-02
Donation: $25 - 3 fish - one_time
Transaction: none
```

The success fixture should include:

- `event_type: donation.created`
- `transaction_status: completed`
- `transaction_id` with a safe demo transaction ID
- Loaves campaign attribution
- One-time donation fields
- Fictional donor/contact fields

The failed payment fixture should include:

- `event_type: payment.failed`
- `transaction_status: failed`
- `transaction_id: null`
- Fish campaign attribution
- One-time donation fields
- Fictional donor/contact fields
- A redacted `failure` object

## 4. Check Payment Data Boundaries

Review:

```text
docs/payment-safety-boundary.md
```

The walkthrough should confirm that checkout event receiving stays future and simulated while issue #55 uses only the safe Foxy demo cart handoff.

Use this scan before committing checkout-related changes:

```bash
rg -n 'card_number|cvv|cvc|api_key|authorization|access_token|client_secret|password|payment credential|payment method secret|raw payment' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html docs/contracts.md examples/checkout-events docs/payment-safety-boundary.md
```

Expected result:

- No matches in JSON fixtures or page markup.
- Matches in docs only when they appear in "do not include" safety language.

Also confirm out-of-scope flows have not crept into the event contract, fixtures, or donation buttons:

```bash
rg -n 'subscription\.created|refund\.created|monthly|recurring_interval|refund_amount|refund_reason|subscription_created|refunded' docs/contracts.md examples/checkout-events wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Expected result:

- No active contract, fixture, or button metadata for subscription or refund flows.

## 5. Confirm Current Boundaries

The current demo connects one-time donation buttons to the Foxy demo cart. Checkout event receiving still stops at reviewed contracts and local fixtures.

In scope:

- Donation button metadata.
- Foxy demo cart link handoff.
- Foxy sidecart loader behavior.
- Simulated checkout event examples.
- Payment data boundary documentation.

Out of scope:

- Laravel webhook receiver implementation.
- Database schema or persistence.
- CRM sync.
- Analytics events.
- Dashboard views.
- Production checkout writes.
- Subscription or refund flows.

## Laravel Receiver Follow-Ups

Capture these for the next middleware/API milestone:

- Validate request shape against the checkout event contract.
- Add signature validation using a local demo signing value.
- Store safe or redacted event payloads.
- Enforce idempotency with `event_id` or `idempotency_key`.
- Normalize campaign, donation, donor, and failure fields.
- Add tests using `examples/checkout-events/*.json`.
- Log failed validation and duplicate-event handling.
- Keep CRM, analytics, and dashboard updates behind later explicit issues.

Current Laravel receiver status:

- `POST /api/checkout/events` exists.
- It validates required checkout event fields, known event types, known transaction statuses, campaign fields, donation fields, donor fields, and failed-payment failure details.
- It rejects obvious forbidden payment or secret fields such as `card_number`, `cvv`, `api_key`, `access_token`, `client_secret`, `payment_method_secret`, and `raw_payment`.
- It acknowledges valid JSON requests with `202 Accepted`.
- It does not verify signatures, store events, enforce idempotency, sync CRM data, emit analytics, or power dashboard views yet.

## Final Verification Commands

Run these before marking the checkout event model and demo cart handoff reviewed:

```bash
php -l wordpress/wp-content/themes/hungry-4-joy/functions.php
jq empty examples/checkout-events/*.json
git diff --check
rg -c 'class="h4j-donation-button"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'class="h4j-donation-button foxycart"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'href="https://hungry-4-joy.foxycart.com/cart' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-donation-type="one_time"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-checkout-provider="foxy"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -n 'subscription\.created|refund\.created|monthly|recurring_interval|refund_amount|refund_reason|subscription_created|refunded' docs/contracts.md examples/checkout-events wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

The syntax, JSON, and diff checks should succeed. The count checks should each return `6`. The final scope scan should return no active subscription or refund fields.
