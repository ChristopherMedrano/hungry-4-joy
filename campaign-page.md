# Campaign Page Setup

This document describes the first Hungry-4-Joy campaign page slice.

The campaign page is a WordPress block template in the Hungry-4-Joy child
theme. It is meant to prove the public-site side of the donation flow before
checkout, middleware, CRM sync, analytics, or dashboard work is connected.

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

The current page is a single public campaign page with local anchor navigation.

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

Donation options are currently plain links styled as buttons. They stay on the
same page for Sprint 1 and do not call Foxy.io, submit a cart, or collect
payment data.

Each donation link should include:

- Human-readable button text.
- A descriptive `aria-label`.
- Safe `data-*` metadata for the future checkout handoff.

Example:

```html
<a
  class="h4j-donation-button"
  href="#campaign-one"
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

- Keep `href` as a local campaign anchor until checkout is explicitly wired.
- Keep `data-donation-amount` numeric and omit the dollar sign.
- Keep visible text, `aria-label`, and metadata consistent.
- Use stable, lowercase, URL-safe campaign IDs.
- Do not include card numbers, CVV values, payment credentials, or payment
  method secrets.

## Campaign Metadata

The Sprint 1 metadata contract is documented in `contracts.md`.

Required fields:

| Field | Purpose |
| --- | --- |
| `data-campaign-id` | Stable machine-readable campaign identifier. |
| `data-campaign-name` | Human-readable campaign name. |
| `data-donation-amount` | Suggested donation amount. |
| `data-donation-label` | Human-readable option label. |
| `data-donation-type` | Giving type, currently `one_time`. |
| `data-source-page` | Page or placement where the donation started. |
| `data-checkout-provider` | Intended future checkout provider, currently `foxy`. |

This metadata is inspectable in browser developer tools. A future checkout
slice can read the same fields and map them into the hosted checkout handoff.

## Current Boundaries

WordPress owns:

- Public campaign content.
- Donation option presentation.
- Safe campaign and donation metadata.
- Basic accessibility and SEO hygiene.

Future checkout work owns:

- Hosted cart or checkout handoff.
- Payment status handling.
- Recurring gift setup.
- Transaction events.

Future Laravel middleware owns:

- Webhook receipt and validation.
- Event storage and idempotency.
- Donor and donation normalization.
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
