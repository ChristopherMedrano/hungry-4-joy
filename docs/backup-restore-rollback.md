# Backup, Restore, and Rollback Runbook

This runbook defines recovery responsibilities for the hosted Hungry-4-Joy
portfolio demo. It is an operator procedure, not evidence that automated
backups or disaster recovery are implemented.

## Current recovery posture

| Surface | Current state | Recoverable source | Owner |
| --- | --- | --- | --- |
| WordPress (`hungry-4-joy-wordpress`) | Free Docker web service; SQLite, uploads, and administrator edits are on an ephemeral filesystem | Repository-owned theme, plugin, container setup, and startup seed | Deployment administrator |
| Middleware (`hungry-4-joy-middleware`) | Free Docker web service; SQLite checkout, handoff, CRM, analytics, and cache rows live on an ephemeral filesystem; startup migrates an empty schema | A known-good Git commit plus environment configuration | Application maintainer and deployment administrator |
| Dashboard (`hungry-4-joy-dashboard`) | Free Docker web service serving a Vite build through nginx; no runtime data of its own | A known-good Git commit | Application maintainer and deployment administrator |
| Queue processing | `QUEUE_CONNECTION=sync`; CRM jobs execute in middleware web requests | Middleware code; stored rows exist only until the container filesystem is replaced | Application maintainer |
| Worker / cron | No background worker, scheduler worker, or Render cron job is provisioned | Not applicable today | Future deployment owner |
| Scheduled reconciliation | Disabled by default; dashboard actions or an explicit Artisan command perform reconciliation | Middleware code; stored rows exist only until the container filesystem is replaced | Support operator |
| Provider configuration and secrets | Stored in Render and provider consoles, never in Git | Provider-owned configuration and an inventory of variable names—not values | Deployment administrator |

Hosted application data is disposable. WordPress content and the middleware
SQLite file both live on the free Render filesystem, which is replaced on
redeploy, restart, or spin-down. `middleware-api/bin/render-start.sh` creates
`/tmp/hungry-4-joy-middleware/demo.sqlite` when it is missing and runs
`php artisan migrate --force`. There is no hosted database to dump, restore, or
upgrade.

Source: [Render free-service limitations](https://render.com/docs/free).

## Recovery objectives for this demo

There is no contractual RTO or RPO. Recovery is best-effort and depends on an
available operator, provider access, and a retained build or Git commit.

- **Middleware data RPO:** none for runtime rows. A new container starts from an
  empty migrated schema.
- **Service RPO:** the last known-good Git commit and current provider
  configuration.
- **RTO:** not guaranteed. A service rollback or redeploy may take minutes and
  always discards in-container SQLite rows.
- **WordPress content RPO:** repository seed state only. Runtime edits and
  uploads are intentionally disposable.

Do not present these assumptions as production availability guarantees.

## Before an incident

The deployment administrator should record, outside the repository:

- the Git commit deployed to each web service;
- whether automatic deploys are enabled;
- the names and owners of required environment variables listed below; and
- who can access Render, GitHub, Foxy, and HubSpot during recovery.

Do not copy SQLite files, checkout rows, or donor details into Git, issues, CI
artifacts, or public demo evidence. Those rows are demo runtime state and are
not a backup.

## Middleware runtime data

Checkout events, handoffs, CRM sync attempts, analytics rows, and the database
cache live in `/tmp/hungry-4-joy-middleware/demo.sqlite` inside the middleware
container. Replacing that container discards the file. Recovery is a redeploy
or restart: the start script creates the file and applies migrations. Do not
copy the SQLite file into the repository or treat a service rollback as a data
restore.

`DB_CONNECTION=sqlite` and `DB_DATABASE` are set in `render.yaml`. Leave
`DB_URL` unset. The start script unsets `DB_URL` before migrating so a leftover
Postgres connection string cannot override the file path.

## Code and service rollback

First identify whether the incident is code-only, configuration-only,
data/schema-related, or provider-related. Do not roll back healthy components
unnecessarily.

### Git history

For a durable source rollback on `main`, create and review a normal `git revert`
commit, run CI, and deploy that new commit. Do not reset or force-push shared
history. This remains the source of truth after Render's emergency rollback.

### Render deploy rollback

Render's **Events** page can roll a service back to a recent successful deploy
whose build artifact is still retained. For the current free web services,
Render limits rollback to the two most recent previous deploys (the running
deploy plus two prior artifacts), so this is not a long-term archive. Other
instance/workspace plans can have different artifact retention. A
dashboard-triggered rollback disables automatic deploys; re-enable them only
after the durable Git fix is ready. API-triggered rollbacks do not disable
automatic deploys.

A Render rollback reuses the target deploy's build artifact and certain
service-specific settings, but it does not roll back disks, platform changes,
or custom domains. The middleware SQLite file is inside the container and is
not restored. Ordinary service environment variables match the target deploy
for the rollback and can therefore reactivate older credentials, tokens, or
feature flags. Render does not replace the service's currently saved
configuration, which a later standard deploy uses. Environment-group values
remain current, although which groups are attached can match the target deploy.

Before confirming a rollback, compare environment-variable **names and private
version/change records**, never values in an issue or log. Confirm `DB_CONNECTION`
stays `sqlite`, `DB_DATABASE` stays the ephemeral file path, `DB_URL` is unset,
and `APP_KEY`, the operator token, Foxy credential generation, and enabled
integration flags are the intended ones. Repeat the check on the running
rollback. Reapply or rotate current credentials in Render and redeploy when the
target deploy's values are no longer safe or compatible.

Sources: [Render rollbacks](https://render.com/docs/rollbacks) and
[Render free-service limitations](https://render.com/docs/free).

### Service-specific procedure

| Surface | Rollback or recovery action | Required verification |
| --- | --- | --- |
| Middleware | Roll back the Render service for containment, then create a reviewed Git revert for the durable fix. Expect an empty SQLite schema after the new container starts. | Public liveness; protected readiness; migrations; webhook signature rejection/acceptance; representative dashboard reads |
| Dashboard | Roll back to a compatible static build. It has no database or persistent runtime state. | Page load, seeded view, operator lock/unlock, authenticated API reads, no token in bundle or storage |
| WordPress | Redeploy a known-good image/commit and allow startup reseeding. Do not attempt to preserve runtime SQLite, uploads, plugins, or admin edits. | Campaign page, donation links and metadata, middleware handoff registration, admin access only if needed |
| Queue worker | None is provisioned. If added later, stop it before incompatible schema/code changes and deploy the same compatible revision as middleware before resuming. | Queue connection, failed jobs, idempotency, provider side effects |
| Scheduler / cron | None is provisioned. Scheduled reconciliation remains off by default. If added later, pause it during recovery and resume only with compatible middleware/schema. | Schedule inventory, one controlled run, duplicate protection, next-run timing |

For a cross-service release, a conservative order is:

1. Pause Foxy webhook delivery before deploying a middleware change that should
   not ingest events during startup.
2. Deploy the compatible middleware revision and confirm migrations ran against
   a new empty SQLite file.
3. Verify middleware health and protected reads.
4. Deploy the compatible dashboard and WordPress revisions.
5. Re-enable provider delivery and perform one controlled end-to-end demo.
6. Re-enable automatic deploys after the Git history contains the durable fix.

## Environment recovery inventory

Record owners and setup instructions, never values. `render.yaml` is the
authoritative checked-in inventory for Blueprint wiring and non-secret defaults.

| Surface | Environment names / provider configuration | Owner |
| --- | --- | --- |
| WordPress | `WP_ADMIN_PASSWORD`, `WP_ADMIN_EMAIL`; Foxy settings represented by repository-owned seeded content | Deployment administrator / Foxy administrator |
| Middleware application | `APP_KEY`, `APP_URL`, `DASHBOARD_OPERATOR_TOKEN`, `DB_CONNECTION`, `DB_DATABASE`; `DB_URL` must stay unset | Deployment administrator |
| Foxy | `FOXY_WEBHOOK_ENCRYPTION_KEY`, `FOXY_CLIENT_ID`, `FOXY_CLIENT_SECRET`, `FOXY_REFRESH_TOKEN`, `FOXY_STORE_ID`; webhook URL/event settings in Foxy | Foxy administrator |
| Dashboard | `MIDDLEWARE_API_TARGET` supplied through Render service wiring; no operator token belongs here | Render / deployment administrator |

HubSpot is disabled by default in the current Blueprint. If enabled later, add
the exact environment-variable names from `middleware-api/.env.example` to the
private recovery inventory and assign a HubSpot credential owner. Never copy
provider values into this runbook, Git, CI logs, or incident notes.

## Incident decision guide

| Symptom | First choice | Avoid |
| --- | --- | --- |
| New code fails; schema is still compatible | Roll back the affected Render service, then create a Git revert | Expecting in-container SQLite rows to survive the rollback |
| Migration and old code are incompatible | Deploy a compatible code/schema pair; the new container migrates a fresh SQLite file | Assuming Render service rollback reverses a migration inside a discarded file |
| Middleware runtime rows disappeared | Redeploy and run a new demo; startup migrates an empty schema | Treating the container SQLite file as a backup |
| WordPress runtime content disappeared | Redeploy/reseed from Git | Treating ephemeral admin edits or uploads as backed up |
| Dashboard-only rendering failure | Roll back/redeploy the dashboard build | Changing middleware or database state without evidence |

## Future work—not implemented

- Durable storage for checkout and CRM rows, if a later demo needs history
  across redeploys.
- Add worker/cron recovery procedures only if those services are actually
  provisioned.

Until durable storage is implemented and tested, the project must not claim
automated backups, point-in-time recovery, or a guaranteed recovery window.
