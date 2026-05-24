# Hungry-4-Joy Data Contracts

This document defines the small data contracts used between parts of the Hungry-4-Joy demo ecosystem.

The goal is to keep each system boundary clear. WordPress prepares campaign and donation context. Checkout receives safe metadata. Later, Laravel will receive checkout events, normalize them, and expose data to CRM, analytics, observability, and dashboard workflows.

These contracts should avoid sensitive payment data. Card numbers, CVV values, raw payment credentials, and payment method secrets do not belong in WordPress, Laravel, HubSpot, logs, or the dashboard.

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

Status: planned.

This future contract will define the event shape Laravel receives after checkout creates a donation or transaction event.

Expected future concerns:

- checkout event ID
- transaction status
- campaign metadata
- donation amount
- donor/contact fields allowed by the checkout event
- timestamps
- duplicate event handling
- failed payment or failed checkout status

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
