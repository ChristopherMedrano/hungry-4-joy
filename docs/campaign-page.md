# Campaign Page Setup

This document describes the first Hungry-4-Joy campaign page slice.

The campaign page is a WordPress block template in the Hungry-4-Joy child
theme. It proves the public-site side of the donation flow and now connects
one-time donation buttons to a safe Foxy demo cart handoff.

## Files

The main campaign template lives here:

```text
wordpress/wp-content/themes/hungry-4-joy/templates/front-page.html
```

Theme styles are written in SCSS:

```text
wordpress/wp-content/themes/hungry-4-joy/assets/scss/
```

The compiled browser CSS is generated here:

```text
wordpress/wp-content/themes/hungry-4-joy/assets/css/style.css
```

Rebuild the compiled CSS after SCSS changes:

```bash
npm run build:wp-css
```

## Page Structure

The current page is a single public campaign page with local anchor navigation and Foxy demo cart donation links.

Main sections:

- Site header and local navigation.
- Hero section with the primary campaign message.
- Loaves campaign section.
- Fish campaign section.
- Email signup placeholder.
- Footer navigation and contact links.

The page uses semantic landmarks and headings:

- The primary navigation is wrapped in a `nav` element.
- The main content starts at `main#top`.
- The page has one `h1` in the hero.
- Campaign and signup sections use `h2` headings.

## Donation Buttons

Donation options are plain links styled as buttons. They point to the Hungry-4-Joy Foxy demo cart and preserve safe campaign/donation metadata in the cart request. Foxy's loader script can intercept those links for sidecart behavior; without the loader, they still work as full-page cart redirects.

The checkout and payment safety boundary is documented in
[`payment-safety-boundary.md`](payment-safety-boundary.md).

Each donation link should include:

- Human-readable button text.
- A descriptive `aria-label`.
- Safe `data-*` metadata for the demo cart handoff and checkout event attribution.

Example:

```html
<a
  class="h4j-donation-button"
  href="https://hungry-4-joy.foxycart.com/cart?name=Loaves+4+Joy&price=25&code=loaves-campaign-01&quantity=1&donation_label=3+loaves&donation_type=one_time&source_page=home&campaign_name=Loaves+4+Joy&checkout_provider=foxy"
  aria-label="Give $25 to Loaves 4 Joy for 3 loaves"
  data-campaign-id="loaves-campaign-01"
  data-campaign-name="Loaves 4 Joy"
  data-donation-amount="25"
  data-donation-label="3 loaves"
  data-donation-type="one_time"
  data-source-page="home"
  data-checkout-provider="foxy"
>$25 &middot; 3 loaves</a>
```

When adding or editing a donation option:

- Keep `href` pointed at the Foxy demo cart domain unless a later issue changes the checkout provider.
- Keep `data-donation-amount` numeric and omit the dollar sign.
- Keep visible text, `aria-label`, and metadata consistent.
- Use stable, lowercase, URL-safe campaign IDs.
- Do not include card numbers, CVV values, payment credentials, or payment
  method secrets.

## Campaign Metadata

The implemented metadata contract is documented in `contracts.md`.

Required fields:

| Field | Purpose |
| --- | --- |
| `data-campaign-id` | Stable machine-readable campaign identifier. |
| `data-campaign-name` | Human-readable campaign name. |
| `data-donation-amount` | Suggested donation amount. |
| `data-donation-label` | Human-readable option label. |
| `data-donation-type` | Giving type, currently `one_time`. |
| `data-source-page` | Page or placement where the donation started. |
| `data-checkout-provider` | Checkout provider for the demo handoff, currently `foxy`. |

This metadata is inspectable in browser developer tools. The Foxy demo cart link should contain matching `name`, `price`, `code`, `quantity`, `donation_label`, `donation_type`, `source_page`, `campaign_name`, and `checkout_provider` parameters.

## Foxy Demo Cart Handoff

The current page submits each one-time donation option to the Foxy demo cart. The handoff is still demo-only and uses safe cart fields rather than provider API credentials.

Each donation button maps to a one-item checkout handoff:

| Button Metadata | Handoff Use |
| --- | --- |
| `data-campaign-id` | Foxy `code`. |
| `data-campaign-name` | Foxy `name` and `campaign_name` option. |
| `data-donation-amount` | Foxy `price`. |
| `data-donation-label` | Foxy `donation_label` option. |
| `data-donation-type` | Foxy `donation_type` option, currently `one_time`. |
| `data-source-page` | Foxy `source_page` option for attribution. |
| `data-checkout-provider` | Foxy `checkout_provider` option, currently `foxy`. |

The handoff calls a hosted demo cart and may open Foxy's sidecart. It does not collect payment details on WordPress, call provider APIs, commit provider secrets, create checkout webhooks, or write production data.

## Current Boundaries

WordPress owns:

- Public campaign content.
- Donation option presentation.
- Safe campaign and donation metadata.
- Basic accessibility and SEO hygiene.

Checkout owns:

- Hosted cart or checkout UI.
- Payment status handling.
- Transaction events.

Later post-MVP checkout work may add recurring gift setup if the campaign page
adds recurring donation controls.

Laravel middleware currently owns:

- Local receiver validation.
- Safe normalized event storage and idempotency.
- Donor and donation normalization.

Future Laravel middleware owns:

- CRM sync jobs and retry status.

Future analytics and dashboard work owns:

- Donation journey events.
- Consent-aware conversion tracking.
- Operational status views.
- Failure and retry visibility.

## Verification

For this slice, a useful check is:

```bash
npm run build:wp-css
git diff --check
```

Then inspect the rendered page locally with DDEV:

```bash
ddev start
ddev launch
```

Manual review should confirm:

- The page title and URL are clean enough for the MVP.
- Heading order is clear.
- Donation links are keyboard reachable.
- Focus states are visible.
- Donation metadata is present on every donation option.
- No sensitive payment data is present in markup, docs, logs, or config.
