# Hungry-4-Joy Data Contracts

This document defines the small data contracts used between parts of the Hungry-4-Joy demo ecosystem.

The goal is to keep each system boundary clear. WordPress prepares campaign and donation context. Checkout receives safe metadata. Later, Laravel will receive checkout events, normalize them, and expose data to CRM, analytics, observability, and dashboard workflows.

These contracts should avoid sensitive payment data. Card numbers, CVV values, raw payment credentials, and payment method secrets do not belong in WordPress, Laravel, HubSpot, logs, or the dashboard.

The project-wide checkout and payment safety boundary is documented in [`payment-safety-boundary.md`](payment-safety-boundary.md).

## 1. Campaign Checkout Metadata

Status: Sprint 1 contract.

This contract defines the safe metadata attached to donation options on the WordPress campaign page before checkout is connected.

The purpose is to make each donation option identifiable before the visitor enters the hosted checkout flow.

For Sprint 1, this contract can be implemented with inspectable `data-*` attributes on donation buttons.

A future Foxy-style checkout implementation may map the same metadata into a form submission or cart request. The contract should stay stable even if the markup changes from button attributes to a hosted checkout handoff.

### Source

WordPress campaign page.

### Destination

Cart / Checkout.

For Sprint 1, this may exist only as markup-level metadata. A later checkout integration can read the values and pass them into the real checkout layer.

`checkout_provider` is internal handoff context for this demo. It helps the project identify the intended checkout integration, but it does not necessarily need to be sent to the checkout provider.

### Required Fields

| Field | Example | Purpose |
| --- | --- | --- |
| `campaign_id` | `loaves-campaign-01` | Stable machine-readable campaign identifier. |
| `campaign_name` | `Loaves 4 Joy` | Human-readable campaign name. |
| `donation_amount` | `25` | Suggested donation amount. |
| `donation_label` | `3 loaves` | Human-readable option label shown to the donor. |
| `donation_type` | `one_time` | Giving type for the donation option. |
| `source_page` | `home` | Page or placement where the donation started. |
| `checkout_provider` | `foxy` | Intended checkout provider for the handoff. |

### Optional Fields

| Field | Example | Purpose |
| --- | --- | --- |
| `campaign_category` | `food` | Groups related campaigns. |
| `display_order` | `2` | Tracks option position on the page. |
| `button_variant` | `suggested` | Distinguishes suggested, featured, or custom amount options. |

### Example Markup

```html
<a
  class="h4j-donation-button"
  href="#campaign-one"
  data-campaign-id="loaves-campaign-01"
  data-campaign-name="Loaves 4 Joy"
  data-donation-amount="25"
  data-donation-label="3 loaves"
  data-donation-type="one_time"
  data-source-page="home"
  data-checkout-provider="foxy"
>
  $25 &middot; 3 loaves
</a>
```

### Example JavaScript Shape

If a later checkout script reads the button dataset, the data should normalize into this shape:

```json
{
  "campaign_id": "loaves-campaign-01",
  "campaign_name": "Loaves 4 Joy",
  "donation_amount": 25,
  "donation_label": "3 loaves",
  "donation_type": "one_time",
  "source_page": "home",
  "checkout_provider": "foxy"
}
```

### Future Checkout Handoff Model

Status: Milestone 2 model only.

The current page does not submit to checkout. A future checkout script or WordPress plugin can read the same `data-*` values and transform them into a hosted cart request.

This model is intentionally provider-light. It describes the project-owned shape first, then shows how those fields may map into a hosted checkout item.

#### WordPress Dataset To Handoff Mapping

| WordPress Attribute | Internal Handoff Field | Checkout Item Field | Notes |
| --- | --- | --- | --- |
| `data-campaign-id` | `campaign.id` | `code` or campaign option | Stable attribution key. |
| `data-campaign-name` | `campaign.name` | `name` or campaign option | Human-readable campaign label. |
| `data-donation-amount` | `donation.amount` | `price` | Numeric amount, no currency symbol. |
| `data-donation-label` | `donation.label` | donation label option | Keeps the selected public label visible later. |
| `data-donation-type` | `donation.type` | giving type option | Milestone 2 value is `one_time`. |
| `data-source-page` | `source.page` | source page option | Identifies where the donation started. |
| `data-checkout-provider` | `checkout.provider` | internal config only | Selects the intended checkout adapter; not automatically sent externally. |

#### Internal Handoff Shape

```json
{
  "checkout": {
    "provider": "foxy",
    "mode": "modeled"
  },
  "campaign": {
    "id": "loaves-campaign-01",
    "name": "Loaves 4 Joy"
  },
  "donation": {
    "amount": 25,
    "currency": "USD",
    "label": "3 loaves",
    "type": "one_time"
  },
  "source": {
    "page": "home"
  }
}
```

#### Modeled Checkout Item Shape

```json
{
  "name": "Loaves 4 Joy",
  "code": "loaves-campaign-01",
  "price": 25,
  "quantity": 1,
  "options": {
    "donation_label": "3 loaves",
    "donation_type": "one_time",
    "source_page": "home",
    "campaign_name": "Loaves 4 Joy"
  }
}
```

#### Ownership Boundary

WordPress owns:

- Rendering donation buttons and readable campaign content.
- Attaching safe metadata to each donation option.
- Keeping visible labels, `aria-label` values, and metadata consistent.
- Keeping the current `href` values as local anchors until checkout is explicitly wired.

The future checkout handoff owns:

- Reading selected button metadata.
- Validating amount, campaign, and giving-type values before handoff.
- Translating the internal handoff shape into the hosted checkout provider format.
- Creating a checkout session or cart request only after a later issue explicitly adds that behavior.

The checkout provider owns:

- Hosted cart and payment collection.
- Payment authorization, declines, and sensitive payment method handling.
- Producing safe checkout events after checkout activity.

For Milestone 2, this section does not add a real checkout URL, hosted cart call, production write, secret, token, or payment credential.

See [`payment-safety-boundary.md`](payment-safety-boundary.md) before adding any checkout handoff behavior.

### Validation Rules

- `campaign_id` should be lowercase, stable, and URL-safe.
- `donation_amount` should be numeric and greater than zero.
- `donation_type` should use a known value such as `one_time`.
- `checkout_provider` should use a known value such as `foxy`.
- `checkout_provider` is internal integration context and is not automatically part of the external checkout payload.
- Metadata should not include sensitive payment details.
- Visible button text should match the metadata value where practical.

### Sprint 1 Acceptance Criteria

- Each donation option has campaign metadata.
- Each donation option has amount metadata.
- Metadata can be inspected in browser developer tools.
- Metadata does not include sensitive payment data.
- The page still works without JavaScript as a campaign page.

## 2. Checkout Event Payload

Status: Milestone 2 contract draft.

This contract defines the safe event shape Laravel will receive after checkout activity.

The purpose is to make checkout results explicit before the project adds a webhook receiver or real checkout integration. Local development can use simulated checkout events that follow this shape.

### Source

Cart / Checkout.

For Milestone 2, this may be a simulated event fixture. A later hosted checkout integration should preserve the same normalized fields even if the provider sends a larger raw event.

### Destination

Laravel middleware webhook receiver.

The Laravel receiver is responsible for validating the event, storing a safe copy, preventing duplicate processing, and normalizing the donation into later CRM, analytics, observability, and dashboard workflows.

### Event Types

| Event Type | Meaning |
| --- | --- |
| `donation.created` | A one-time donation completed successfully. |
| `payment.failed` | A checkout or payment attempt failed and should not create a confirmed donation record. |

### Transaction Status Values

| Status | Meaning |
| --- | --- |
| `completed` | Checkout confirmed the one-time donation. |
| `failed` | Checkout or payment did not complete. |
| `pending` | Checkout has not produced a final result yet. |

### Required Envelope Fields

| Field | Example | Purpose |
| --- | --- | --- |
| `event_id` | `evt_h4j_20260527_0001` | Stable unique checkout event identifier. |
| `event_type` | `donation.created` | Event category for routing and normalization. |
| `event_created_at` | `2026-05-27T14:05:00Z` | ISO 8601 timestamp for when checkout created the event. |
| `checkout_provider` | `foxy` | Checkout provider or simulator that produced the event. |
| `checkout_session_id` | `sess_demo_9M4K2` | Safe session or cart identifier for support and reconciliation. |
| `transaction_id` | `txn_demo_1042` | Safe provider transaction identifier when one exists; may be `null` for failed checkouts. |
| `transaction_status` | `completed` | Final or current transaction state. |
| `idempotency_key` | `evt_h4j_20260527_0001` | Key Laravel uses to avoid processing duplicate events. |
| `source_page` | `home` | Page or placement where the donation started. |

### Required Campaign Fields

These fields should align with the WordPress campaign checkout metadata contract.

| Field | Example | Purpose |
| --- | --- | --- |
| `campaign.campaign_id` | `loaves-campaign-01` | Stable machine-readable campaign identifier. |
| `campaign.campaign_name` | `Loaves 4 Joy` | Human-readable campaign name. |

### Required Donation Fields

| Field | Example | Purpose |
| --- | --- | --- |
| `donation.amount` | `25` | Donation amount in the event currency. |
| `donation.currency` | `USD` | Three-letter currency code. |
| `donation.donation_label` | `3 loaves` | Human-readable option label selected by the donor. |
| `donation.donation_type` | `one_time` | Giving type for the current Milestone 2 checkout flow. |

### Safe Donor / Contact Fields

Checkout events may include donor/contact fields that Laravel can use for CRM sync and support workflows.

| Field | Example | Purpose |
| --- | --- | --- |
| `donor.email` | `jordan.helper@example.test` | Contact identity for follow-up and CRM sync. |
| `donor.first_name` | `Jordan` | Donor first name. |
| `donor.last_name` | `Helper` | Donor last name. |
| `donor.phone` | `555-0104` | Optional support contact number if checkout provides it. |

### Failure Fields

Failed checkout events should include enough safe information to troubleshoot without storing sensitive payment data.

| Field | Example | Purpose |
| --- | --- | --- |
| `failure.failure_code` | `card_declined` | Safe normalized failure category. |
| `failure.failure_message` | `Payment was declined by the test gateway.` | Redacted message safe for logs and dashboard views. |
| `failure.provider_status` | `declined` | Safe provider status value. |

### Local Fixture Examples

The standalone JSON fixtures are the source of truth for simulated checkout event examples:

- [`donation-created.one-time.json`](../examples/checkout-events/donation-created.one-time.json)
- [`payment-failed.one-time.json`](../examples/checkout-events/payment-failed.one-time.json)

This contract defines the required fields, event types, statuses, and validation rules. The fixture files provide complete reusable payloads for future local middleware tests.

Keep examples in the fixture files instead of duplicating full JSON payloads in this document.

### Validation Rules

- `event_id` must be unique, stable, and safe to store.
- `idempotency_key` must be present. For Milestone 2, it can match `event_id`.
- `event_created_at` must use ISO 8601 format.
- `event_type` and `transaction_status` must use known contract values.
- `donation.amount` must be numeric and greater than zero.
- `donation.currency` should use `USD` for this demo.
- `donation.donation_type` should use `one_time` for Milestone 2.
- `campaign.campaign_id` and `campaign.campaign_name` should match the campaign metadata that started checkout.
- `transaction_id` is required for `donation.created`; it may be `null` for failed checkouts that never produced a transaction.
- `failure` is required when `event_type` is `payment.failed`.
- Duplicate events should be logged and ignored after the first successful processing attempt.

### Out Of Milestone 2 Scope

The current WordPress campaign page only models one-time donation buttons. Milestone 2 should not include subscription event payloads, recurring interval fields, refund event payloads, or refund amount fields.

Those flows can become separate contracts later if the project adds recurring donation controls or refund reconciliation work.

### Explicitly Forbidden Fields

The checkout event contract must not include:

- full card number
- CVV or CVC values
- raw payment credentials
- payment method secrets
- checkout API keys
- authorization headers
- access tokens
- client secrets
- unredacted provider payloads
- private donor notes

See [`payment-safety-boundary.md`](payment-safety-boundary.md) for the full checkout and payment safety checklist.

### Milestone 2 Acceptance Criteria

- Successful checkout events include event, transaction, campaign, donation, donor, timestamp, and idempotency fields.
- Failed checkout events include a failure object and do not imply a confirmed donation.
- Campaign attribution fields align with the WordPress donation metadata contract.
- Duplicate-event handling is represented through `idempotency_key`.
- The contract remains safe for public documentation and does not include sensitive payment data.

## 3. CRM / Marketing Sync Payload

Status: planned.

This future contract will define the normalized data Laravel sends to CRM / Marketing after checkout events are received and validated.

Expected future concerns:

- contact identity
- donation activity
- campaign attribution
- follow-up status
- sync result
- retry state

## 4. Dashboard Status Payload

Status: planned.

This future contract will define the data exposed by Laravel for the status dashboard.

Expected future concerns:

- donation records
- webhook event status
- CRM sync status
- failed jobs
- retry history
- reconciliation notes

## Contract Principles

- Keep payment-sensitive data out of project-owned systems.
- Use stable machine-readable identifiers for system handoffs.
- Keep human-readable labels available for debugging and dashboard views.
- Make each handoff inspectable during local development.
- Prefer small, explicit payloads over large unstructured blobs.
- Mark planned contracts as planned until implemented.
