# Hungry-4-Joy

Hungry-4-Joy is a public portfolio demo of a lean nonprofit donation system. It
connects a WordPress campaign site, Foxy hosted checkout, a Laravel integration
API, HubSpot CRM synchronization, consent-aware analytics, and a React support
dashboard.

The project focuses on integration boundaries and support workflows rather than
being a general-purpose fundraising platform. It demonstrates signed webhook
ingestion, canonical donation identity, idempotency, safe CRM retry,
reconciliation, operational visibility, and deployment on Render.

## Live demo

| Surface | URL | Public experience |
| --- | --- | --- |
| Campaign site | [hungry-4-joy-wordpress.onrender.com](https://hungry-4-joy-wordpress.onrender.com) | Campaign and test checkout entry point |
| Support dashboard | [hungry-4-joy-dashboard.onrender.com](https://hungry-4-joy-dashboard.onrender.com) | Credential-free **Seeded** portfolio view; Live API requires operator access |
| Middleware health | [hungry-4-joy-middleware.onrender.com/api/health](https://hungry-4-joy-middleware.onrender.com/api/health) | Public liveness only |

The hosted services can take a short time to wake on Render's free tier.

## Product tour

The donor-facing WordPress campaign site:

![Campaign site](docs/images/09-wordpress.webp)

Foxy hosts checkout. The demo banner supplies Foxy's test-card details so the
flow can be exercised without a real payment:

- Approved payment: `4111 1111 1111 1111`, any future expiry and any CSC.
- Declined payment: the same card with billing ZIP `46282`.

![Checkout demo](docs/images/10-checkout-demo.webp)

The React dashboard brings checkout, CRM, analytics, and readiness data into one
support view:

![Dashboard home](docs/images/01-dashboard.webp)

<details>
<summary><strong>Dashboard screenshot tour</strong></summary>

### Checkout events

![Events](docs/images/02-events.webp)

![Event detail modal](docs/images/03-event-modal.webp)

### Cart and CRM sync issues

![Cart Sync Issues](docs/images/04-cart-sync-issues.webp)

![CRM Sync Issues](docs/images/05-crm-sync-issues.webp)

### System status and analytics

![System status](docs/images/06-system-status.webp)

![Server Analytics](docs/images/07-server-analytics.webp)

### Notifications (seeded visual preview)

The notification panel is a presentation mock. Automated incident flags and
external notification delivery are out of scope.

![Notifications](docs/images/08-notifications.webp)

</details>

## Implemented architecture

```text
WordPress campaign site
  -> Foxy hosted cart and checkout
  -> signed Foxy webhook
  -> Laravel middleware + PostgreSQL
       -> synchronous HubSpot CRM sync
       -> server conversion records and integration logs
       -> operator-protected dashboard API
  -> React support dashboard
```

- WordPress owns campaign content, safe donation metadata, consent-aware browser
  analytics, and the checkout handoff.
- Foxy owns cart, checkout, payment collection, and transaction webhooks. Payment
  card data never enters project storage.
- Laravel verifies and normalizes provider events, deduplicates deliveries,
  stores operational state, reconciles handoffs, and performs retry-safe CRM
  synchronization.
- The dashboard exposes a public seeded demonstration. Live donor/support data,
  readiness details, and mutations require the server-configured operator bearer
  token.
- GitHub Actions validates the Laravel, WordPress, fixture, and dashboard
  surfaces. Render hosts the three live web services and PostgreSQL.

See [Architecture](docs/architecture.md) and [Data contracts](docs/contracts.md)
for the detailed boundaries.

## Technology

- WordPress, PHP, block patterns, and Sass
- Foxy hosted checkout and webhooks
- Laravel 12, PostgreSQL, and synchronous Laravel jobs
- HubSpot CRM API with a fake local client
- Vite, React, TypeScript, and Tailwind CSS
- DDEV for local WordPress development
- Render Blueprint deployment and GitHub Actions CI

## Run locally

Prerequisites are PHP 8.4, Composer, Node.js 22, npm, `jq`, and DDEV for the
WordPress surface.

Install dependencies and run the repository checks:

```bash
npm ci
cd middleware-api && composer install && cd ..
npm test
```

Start WordPress:

```bash
ddev start
ddev launch
```

Start the middleware after copying its example environment file to a local,
ignored `.env` and configuring local values:

```bash
cd middleware-api
php artisan migrate
php artisan serve
```

Start the dashboard in another terminal:

```bash
npm run dev:dashboard
```

The dashboard offers a credential-free Seeded mode. Live API modes begin locked
and require a private `DASHBOARD_OPERATOR_TOKEN` configured on the middleware
and supplied at runtime; it is never bundled into the browser application.
Component-specific setup lives in [dashboard/README.md](dashboard/README.md)
and [middleware-api/README.md](middleware-api/README.md).

## Verification

The full root suite compiles the tracked WordPress CSS, validates fixtures,
checks WordPress runtime safety and checkout JavaScript, runs Laravel tests,
tests the dashboard operator lifecycle, builds the dashboard, and checks the
diff:

```bash
npm test
```

Useful focused commands:

```bash
npm run test:middleware
npm run test:dashboard
npm run check:fixtures
npm run build:wp-css
```

Use the [MVP smoke-test checklist](docs/mvp-smoke-test-checklist.md) for the
safe local release gate. Live Foxy, HubSpot, Render, and hosted mutation checks
require separate authorization and private configuration.

## Safety and current limits

- No raw card data, gateway credentials, provider secrets, environment files,
  database dumps, or private support captures belong in Git.
- Foxy webhooks require provider signatures. Operator APIs require a bearer
  token. CORS is an additional browser boundary, not authentication.
- WordPress uses ephemeral hosted storage and is rebuilt from repository-owned
  theme/plugin code. The dashboard is stateless.
- The current free Render PostgreSQL service has no managed backups or
  point-in-time recovery and expires under Render's free-database policy.
- CRM jobs run synchronously. No worker or cron service is provisioned, and
  scheduled reconciliation is disabled by default.
- External analytics delivery, automated incident flags, and external
  notification delivery are out of scope. Stored server conversion records and
  integration logs remain available for the demo.
- SSO and multi-user RBAC are not implemented; the shared operator token is a
  deliberately bounded portfolio-demo control.

Review [Payment safety](docs/payment-safety-boundary.md),
[Access control](docs/access-control.md), and the
[Backup/rollback runbook](docs/backup-restore-rollback.md) before extending the
runtime boundaries.

## Documentation

- [Architecture](docs/architecture.md)
- [Data contracts](docs/contracts.md)
- [Foxy integration](docs/foxy-integration.md)
- [Access control](docs/access-control.md)
- [Checkout and payment safety](docs/payment-safety-boundary.md)
- [Render deployment](docs/render-deployment.md)
- [Repository safety](docs/repository-safety-audit.md)
- [Backup, restore, and rollback](docs/backup-restore-rollback.md)
- [MVP smoke-test checklist](docs/mvp-smoke-test-checklist.md)
- [Demo handoff and support runbook](docs/demo-handoff-support-runbook.md)

Implementation status is tracked in [GitHub Issues](https://github.com/ChristopherMedrano/hungry-4-joy/issues)
and [Milestones](https://github.com/ChristopherMedrano/hungry-4-joy/milestones).

Built with AI-assisted development.
