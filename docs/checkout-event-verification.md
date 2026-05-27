# Checkout Event Verification Walkthrough

This walkthrough reviews the Hungry-4-Joy Milestone 2 checkout event model before Laravel middleware work begins.

Use it when changing donation button metadata, checkout handoff docs, simulated checkout event fixtures, or the checkout/payment boundary.

## What This Verifies

- Donation buttons expose the expected campaign metadata.
- Button metadata maps cleanly into the modeled checkout handoff.
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

## 2. Review The Modeled Checkout Handoff

Open the handoff model in:

```text
docs/contracts.md
```

Review the `Future Checkout Handoff Model` section.

The important mapping is:

| Button Metadata | Internal Handoff Field | Modeled Checkout Field |
| --- | --- | --- |
| `data-campaign-id` | `campaign.id` | `code` or campaign option |
| `data-campaign-name` | `campaign.name` | `name` or campaign option |
| `data-donation-amount` | `donation.amount` | `price` |
| `data-donation-label` | `donation.label` | donation label option |
| `data-donation-type` | `donation.type` | giving type option |
| `data-source-page` | `source.page` | source page option |
| `data-checkout-provider` | `checkout.provider` | internal adapter/config only |

The modeled checkout handoff should stay inactive for Milestone 2. It should not add:

- Real checkout URLs.
- Hosted cart calls.
- Checkout session creation.
- Production writes.
- Secrets, tokens, or payment credentials.

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

The walkthrough should confirm that Milestone 2 stays metadata-only and simulated.

Use this scan before committing checkout-related changes:

```bash
rg -n 'card_number|cvv|cvc|api_key|authorization|access_token|client_secret|password|payment credential|payment method secret|raw payment' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html docs/contracts.md examples/checkout-events docs/payment-safety-boundary.md
```

Expected result:

- No matches in JSON fixtures or page markup.
- Matches in docs only when they appear in "do not include" safety language.

Also confirm out-of-scope flows have not crept into Milestone 2:

```bash
rg -n 'subscription\.created|refund\.created|monthly|recurring_interval|refund_amount|refund_reason|subscription_created|refunded' docs/contracts.md examples/checkout-events wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Expected result:

- No active contract, fixture, or button metadata for subscription or refund flows.

## 5. Confirm Current Boundaries

Milestone 2 stops at reviewed contracts and local fixtures.

In scope:

- Donation button metadata.
- Modeled checkout handoff.
- Simulated checkout event examples.
- Payment data boundary documentation.

Out of scope:

- Laravel webhook receiver implementation.
- Database schema or persistence.
- CRM sync.
- Analytics events.
- Dashboard views.
- Live checkout wiring.
- Production checkout writes.

## Laravel Receiver Follow-Ups

Capture these for the next middleware/API milestone:

- Add a Laravel route for checkout event receipt.
- Validate request shape against the checkout event contract.
- Add signature validation using a local demo signing value.
- Store safe or redacted event payloads.
- Enforce idempotency with `event_id` or `idempotency_key`.
- Normalize campaign, donation, donor, and failure fields.
- Add tests using `examples/checkout-events/*.json`.
- Log failed validation and duplicate-event handling.
- Keep CRM, analytics, and dashboard updates behind later explicit issues.

## Final Verification Commands

Run these before marking the checkout event model reviewed:

```bash
jq empty examples/checkout-events/*.json
git diff --check
rg -c 'class="h4j-donation-button"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-donation-type="one_time"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -c 'data-checkout-provider="foxy"' wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
rg -n 'subscription\.created|refund\.created|monthly|recurring_interval|refund_amount|refund_reason|subscription_created|refunded' docs/contracts.md examples/checkout-events wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

The first five commands should succeed. The final scope scan should return no active subscription or refund fields for Milestone 2.
