# Demo Handoff and Support Runbook

This is the starting point for demonstrating, evaluating, supporting, or
extending Hungry-4-Joy. It describes the current portfolio demo; it is not a
production operations agreement. Use the focused documents linked below for
commands and detailed procedures rather than copying those procedures here.

## Choose an entry path

| Audience | Safe starting point | Access and boundary |
| --- | --- | --- |
| Portfolio visitor | Open the hosted [campaign site](https://hungry-4-joy-wordpress.onrender.com), then explore the dashboard's **Seeded** view | No credentials. Do not interpret seeded records or the notification preview as live operations. |
| Local evaluator | Follow Tier 1 of the [MVP smoke-test checklist](mvp-smoke-test-checklist.md) | Local SQLite, tracked fictional fixtures, fake HubSpot, and no provider writes. |
| Support operator | Use the [dashboard setup](../dashboard/README.md) and [access-control boundary](access-control.md) | Live API data and actions require the privately supplied operator token. Provider mutations require separate authorization. |
| Maintainer | Start with [architecture](architecture.md), [contracts](contracts.md), and the [smoke-test checklist](mvp-smoke-test-checklist.md) | Repository and CI access does not imply access to Render, Foxy, HubSpot, or operator credentials. |
| Deployment or recovery administrator | Use the [Render deployment guide](render-deployment.md) and [backup/restore/rollback runbook](backup-restore-rollback.md) | Runtime configuration, deploys, database recovery, and secret rotation require explicit authority. |

Roles, credential owners, public routes, and protected routes are authoritative
in [access-control.md](access-control.md). Never place an operator token in a URL,
command argument, screenshot, issue, log, or public evidence file.

## Current system and data flow

```text
WordPress campaign button
  -> generates donation_attempt_id and registers a public handoff
  -> opens the Foxy cart with safe campaign/donation metadata
  -> Foxy owns payment data and sends a signed transaction webhook
  -> Laravel validates, normalizes, deduplicates, and stores the event in Postgres
  -> eligible completed donations run the HubSpot sync job inline
  -> browser code emits consent-aware dataLayer events
  -> Laravel stores server analytics and integration-step records
  -> React dashboard shows Seeded preview or token-protected Live API data/actions
```

The implementation sources are the child theme in
[`wordpress/wp-content/themes/hungry-4-joy/`](../wordpress/wp-content/themes/hungry-4-joy/),
the [checkout fixtures](../examples/checkout-events/), the
[`middleware-api/`](../middleware-api/) Laravel app, and the
[`dashboard/`](../dashboard/) React app. Field ownership and status vocabulary
come from [contracts.md](contracts.md); the Foxy handoff, webhook, and
reconciliation rules come from
[Foxy integration guide](foxy-integration.md).

Important current behavior:

- A Foxy transaction with an empty raw `status` is a completed donation.
  `data_is_fed` is webhook-delivery state, not payment status.
- The hosted ZIP `46282` decline can create a Foxy cart/error-log record without
  creating a transaction. Its expected trace can therefore have
  `checkout_event: null` and `foxy_transaction_not_found`.
- Checkout ingest deduplicates by `event_id` or `idempotency_key`; ordinary
  replay returns `duplicate_ignored`. The narrowly documented legacy
  empty-status correction is the only `corrected` replay case.
- `QUEUE_CONNECTION=sync` runs CRM jobs inside the middleware web request. No
  queue worker, scheduler worker, or Render cron service is provisioned, and
  scheduled handoff reconciliation is disabled by default.

## Setup and verification map

Use these documents as the single sources of truth:

| Need | Authoritative file |
| --- | --- |
| Install, local WordPress/DDEV, middleware, dashboard, and CI entry points | [Repository README](../README.md) |
| Required release rehearsal and exact safe commands | [MVP smoke-test checklist](mvp-smoke-test-checklist.md) |
| Campaign fields and fixture meaning | [Data contracts](contracts.md) and [checkout fixtures](../examples/checkout-events/README.md) |
| Receiver replay and validation | [Middleware setup](../middleware-api/README.md) |
| Seeded and local/hosted dashboard inspection | [Dashboard setup](../dashboard/README.md) |
| Payment and PCI-safe data boundary | [Payment safety boundary](payment-safety-boundary.md) |
| Runtime variables and hosted deployment | [Render deployment](render-deployment.md) |
| Tracked-content and secret-safety checks | [Repository safety audit](repository-safety-audit.md) |
| Incident rollback and data recovery | [Backup/restore/rollback](backup-restore-rollback.md) |

Before a local evaluation, confirm PHP 8.4, Node.js 22, Composer, `jq`, and DDEV
when WordPress is needed. Install locked dependencies and execute Tier 1 exactly
as written in the smoke checklist. Tier 1 uses in-memory/local SQLite, fictional
`@example.test` records, and fake integrations. Browser-only and hosted checks
are explicitly labeled; do not turn a local rehearsal into an external call.

## Suggested demo narrative

1. Show the campaign page, one-time donation choices, consent behavior, and the
   safe campaign metadata boundary. Do not enter or record payment data outside
   Foxy's sandbox checkout.
2. Open the dashboard in **Seeded** mode. Trace a completed donation from
   checkout event through CRM and stored server analytics, then contrast the
   pending, failed, retryable, and warning examples.
3. Explain the canonical `donation_attempt_id`, provider transaction ID, and
   ingest idempotency key. They solve different identity problems.
4. Show System status and integration-step history as application-owned
   observability. Explain that the notification panel is a visual preview, not
   a delivered alert feed.
5. Close with the safe operating boundaries: signed Foxy webhook, protected
   Live API/actions, fake-by-default CRM, stored analytics with no external
   delivery, and explicit authorization for hosted mutations.

The safe local evidence for this narrative is defined in the
[smoke-test checklist](mvp-smoke-test-checklist.md). A hosted checkout, webhook
refeed, CRM retry, handoff reconciliation, or unfed sweep is never implied by a
demo request; each needs authorization from the affected service owner.

## Support intake and evidence

Start with a timestamp and timezone, deployed commit, environment name, public
or authenticated route, `donation_attempt_id` when available, safe transaction
or cart ID, expected result, actual result, and the first failing integration
step. Use the dashboard detail/attempt trace, protected readiness, and Laravel
logs to correlate the same attempt.

Evidence may contain safe IDs, status/error codes, redacted summaries, fixture
names, and aggregate row counts. Do not capture donor names, email, phone,
addresses, authorization headers, secrets, raw provider payloads, database
URLs/dumps, or payment fields. Never request full card data or CVV. Stop and
escalate if sensitive data appears, authorization/signature checks fail, the
database is unavailable, or an unapproved provider write occurs.

## Troubleshooting

### Failed payment or checkout

**Signals:** In local fixture testing, `payment.failed` stores a failed checkout
event, redacted failure fields, `PaymentFailed` server analytics, and no CRM
attempt. In the hosted ZIP `46282` path, Foxy may instead have only a cart/error
log and the middleware handoff may show `foxy_transaction_not_found` with no
checkout event.

**Safe actions:** Search Checkout Attempts by `donation_attempt_id`. If support
has only the numeric Foxy error-log cart ID, use the dashboard's by-cart lookup
to recover the attempt identity. Confirm whether Foxy created a transaction
before expecting a webhook event. Compare behavior with the tracked
[`payment-failed.one-time.json`](../examples/checkout-events/payment-failed.one-time.json)
only in the local receiver workflow.

**Stop/escalate:** Do not manufacture a completed event, retry CRM for a failed
payment, or interpret an empty Foxy transaction status as failure. Provider
console inspection, a new sandbox checkout, reconciliation, or replay requires
explicit authorization. Escalate unexplained gateway behavior to the Foxy/test
gateway owner with redacted evidence.

### Duplicate event

**Signals:** A repeated event returns `duplicate_ignored`, one checkout-event
row remains, no second CRM sync or server conversion is created, and the
integration timeline can record a skipped duplicate step.

**Safe actions:** Compare safe `event_id`, `idempotency_key`, transaction ID, and
`donation_attempt_id` values. Run the fixture receiver idempotency tests or
replay tracked fixtures locally. Confirm the apparent duplicate is not merely
two UI results from different filters or identifiers.

**Stop/escalate:** Do not delete either record or refeed a hosted webhook to
test deduplication without authorization. Escalate if the same event/key creates
more than one checkout row, CRM attempt, Deal, or `DonationCompleted` record.
Follow the contracts before considering the narrowly scoped legacy `corrected`
path.

### Missing CRM sync

**Signals:** Confirm the checkout event is `donation.created` / `completed` and
has the required donor email. The event detail distinguishes `not_applicable`,
`pending`, `succeeded`, `failed`, `retryable`, and the succeeded
`hubspot_list_warning` case. The integration timeline shows dispatch and
completion where they occurred. The HubSpot readiness check reports `disabled`,
`enabled`, or `not_configured`; only the overall readiness result uses
`degraded` when an optional integration needs attention.

**Safe actions:** In local evaluation, expect `hubspot_mode: fake` and fake IDs
when `HUBSPOT_ENABLED=false`; that is success through the fake client, not a
live HubSpot write. For an authorized hosted incident, verify variable names and
feature state privately, then correlate the stored CRM attempt and safe error
code. Fix mapping/configuration before retrying.

**Stop/escalate:** Failed payments are intentionally ineligible. Do not enable
HubSpot, paste a private-app token, edit a Deal, or trigger a retry as a
diagnostic shortcut. Escalate a missing/duplicate live contact or Deal to the
credential owner with only safe IDs and redacted errors.

### Retry failure

**Signals:** Manual retry is eligible only for `failed`, `retryable`, or a
`succeeded` attempt with `hubspot_list_warning`. A retry updates the same CRM
attempt. `retry_count` increments when a sync attempt fails and on every
list-enrollment retry; a normal successful retry after an earlier failure can
retain the prior count. Use the current status, safe error fields,
`last_attempted_at`, and integration timeline—not a count change alone—to
confirm its outcome. Clean succeeded, pending, ineligible, or unknown attempts
are rejected. `next_retry_at` is informational because no automatic scheduler
exists.

**Safe actions:** Reproduce with `FakeHubSpotClient` and the focused dashboard
retry tests. Read the latest safe CRM error and integration step, correct the
underlying configuration/mapping, then perform one authorized manual retry.
Verify that the same CRM-attempt row was updated, its final status/error and
latest integration step agree, and the checkout row was not duplicated. For a
list-warning retry, also expect `retry_count` to increase by one.

**Stop/escalate:** Do not repeatedly press Retry, bypass eligibility, or assume a
worker will pick it up later. Stop on persistent failure, unexpected provider
writes, a new duplicate CRM object, or an error that reveals sensitive data;
escalate to the middleware and HubSpot owners.

### Dashboard identity or status mismatch

**Signals:** Compare `donation_attempt_id` across handoff, checkout event, CRM
attempt/Deal, integration steps, and server analytics. Also compare cart,
transaction, checkout-session, event, and idempotency IDs without treating them
as interchangeable. A stale legacy empty-status row can be the documented
exception; an ordinary completed empty status should already display completed.

**Safe actions:** Lock and refresh the dashboard, unlock again when authorized,
clear filters, and perform the protected by-attempt lookup. Use by-cart only for
a numeric Foxy cart ID. Check the API result and database-backed integration
timeline to determine whether the mismatch is ingestion, linkage, CRM mapping,
or UI presentation. Reproduce with seeded/local data before changing live state.

**Stop/escalate:** Do not edit database rows, expose the operator token, run a
bulk reconcile/sweep, or refeed a webhook merely to make the UI agree. Escalate
when identifiers truly disagree, a completed event appears failed, the API and
UI represent the same payload differently, or protected data is publicly
accessible.

## Current limits and gates

- The WordPress Render filesystem is ephemeral. Runtime admin edits, SQLite
  content, and uploads can disappear; repository-owned seed/theme state is the
  recovery source.
- Free Render Postgres expires and has no managed backups or point-in-time
  recovery. Manual off-repository dumps and restore drills are not automated.
- The public dashboard supports a credential-free Seeded preview. Live data,
  detailed readiness, retry, reconcile, and sweep actions require the shared
  operator bearer token. SSO and multi-user RBAC are not implemented.
- Live HubSpot writes are off by default and require private runtime
  configuration. Local/test flows use `FakeHubSpotClient`.
- Browser analytics use a consent-aware local `dataLayer`; server analytics are
  stored in the application database. No external analytics sender is
  implemented, even if the provider feature flag is enabled.
- The notification UI is a seeded visual preview. Automated incident flags and
  external notification delivery are out of scope.
- There is no background worker or cron. CRM jobs are synchronous; automatic
  retry and scheduled reconciliation are unavailable. Reconcile and sweep are
  bounded operator actions that can call Foxy when configured.
- This is a public portfolio demo, not a production fundraising platform. It
  has no production availability, retention, recovery, or support SLA.

## Safe extension sequence

1. Update [contracts.md](contracts.md) and the relevant architecture boundary
   before changing a cross-system field, status, or ownership rule.
2. Add fictional `@example.test` fixtures and focused fake/local tests first.
   Never copy production/provider payloads into the repository.
3. Preserve idempotency, the canonical attempt identity, webhook signature,
   operator authorization, payment-data exclusions, and disabled-by-default
   provider gates.
4. Run Tier 1 and CI. Review documentation, deployment, data migration,
   rollback, and secret-ownership impact.
5. Request explicit authorization for any hosted deploy, provider test, secret
   change, database write, webhook refeed, or public evidence capture.
6. Record safe results and update this routing document only when a source of
   truth or operating boundary changes.

## Ownership transfer checklist

- [ ] Repository, default branch, current commit, open milestones, and CI owners
  are identified.
- [ ] WordPress, middleware, dashboard, and Postgres service owners are known;
  no secret values are copied into the handoff record.
- [ ] Foxy webhook/hAPI, HubSpot private-app, operator-token, database, and
  WordPress-admin credential owners and rotation paths are known.
- [ ] The new operator can distinguish public Seeded mode from protected Live
  API mode and can collect redacted evidence.
- [ ] Tier 1 has been rehearsed from the current commit; manual and Tier 2 steps
  are recorded as passed, failed, not run, or not authorized.
- [ ] Database expiration, latest off-repository dump status, rollback owner,
  and known recovery limitations are recorded privately.
- [ ] Known unavailable features and follow-up owners are acknowledged rather
  than represented as active.

Project tracking: [MVP 7 milestone](https://github.com/ChristopherMedrano/hungry-4-joy/milestone/8)
and [launch-hardening epic #48](https://github.com/ChristopherMedrano/hungry-4-joy/issues/48).
