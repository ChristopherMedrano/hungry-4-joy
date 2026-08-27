# Backup, Restore, and Rollback Runbook

This runbook defines recovery responsibilities for the hosted Hungry-4-Joy
portfolio demo. It is an operator procedure, not evidence that automated
backups or disaster recovery are implemented.

## Current recovery posture

| Surface | Current state | Recoverable source | Owner |
| --- | --- | --- | --- |
| WordPress (`hungry-4-joy-wordpress`) | Free Docker web service; SQLite, uploads, and administrator edits are on an ephemeral filesystem | Repository-owned theme, plugin, container setup, and startup seed | Deployment administrator |
| Middleware (`hungry-4-joy-middleware`) | Free Docker web service; runs migrations at startup | A known-good Git commit plus environment configuration | Application maintainer and deployment administrator |
| Middleware database (`hungry-4-joy-middleware-db`) | Free Render Postgres; application source of truth | The latest operator-created logical dump, if one exists | Data/recovery operator |
| Dashboard (`hungry-4-joy-dashboard`) | Free Docker web service serving a Vite build through nginx; no runtime data of its own | A known-good Git commit | Application maintainer and deployment administrator |
| Queue processing | `QUEUE_CONNECTION=sync`; CRM jobs execute in middleware web requests | Middleware code and database records | Application maintainer |
| Worker / cron | No background worker, scheduler worker, or Render cron job is provisioned | Not applicable today | Future deployment owner |
| Scheduled reconciliation | Disabled by default; dashboard actions or an explicit Artisan command perform reconciliation | Middleware code and database records | Support operator |
| Provider configuration and secrets | Stored in Render and provider consoles, never in Git | Provider-owned configuration and an inventory of variable names—not values | Deployment administrator |

The free Postgres database is the only durable application-data surface, but it
has a deliberately weak demo recovery posture. Render states that a free
database expires 30 days after creation, becomes inaccessible at expiration,
can be recovered only by upgrading during a 14-day grace period, and is deleted
with its data after that grace period. Free databases have no Render-managed
backup, logical-export, or point-in-time recovery capability. While it remains
accessible, an operator can create a logical dump with `pg_dump`.

Sources: [Render free-service limitations](https://render.com/docs/free) and
[Render Postgres recovery and backups](https://render.com/docs/postgresql-backups).

## Recovery objectives for this demo

There is no contractual RTO or RPO. Recovery is best-effort and depends on an
available operator, provider access, a retained build or Git commit, and—for
database history—a recent logical dump.

- **Database RPO:** time since the most recent verified manual dump. With no
  dump, all database history may be lost after deletion or unrecoverable data
  corruption.
- **Service RPO:** the last known-good Git commit and current provider
  configuration.
- **RTO:** not guaranteed. A service-only rollback may take minutes; rebuilding
  and restoring a database is a manual operation that may take hours.
- **WordPress content RPO:** repository seed state only. Runtime edits and
  uploads are intentionally disposable.

Do not present these assumptions as production availability guarantees.

## Before an incident

The deployment administrator should record, outside the repository:

- database creation and expiration dates and the responsible person's contact;
- the Git commit deployed to each web service;
- whether automatic deploys are enabled;
- the date, PostgreSQL major version, size, checksum, encryption location, and
  restore-test result for each retained dump;
- the names and owners of required environment variables listed below; and
- who can access Render, GitHub, Foxy, and HubSpot during recovery.

Database dumps can contain donor names, contact details, transaction metadata,
and provider identifiers. Store them encrypted in approved off-repository
storage with access and retention controls. Never attach a dump to a GitHub
issue, CI artifact, support transcript, or public demo evidence.

## Manual Postgres logical backup

Use this only while the free database is accessible. It does not create an
automated schedule or retention guarantee.

1. Select a protected destination outside the repository. Confirm it has enough
   space and is not cloud-synced to an unapproved account.
2. From the database's Render **Info** page, obtain the external host, port,
   database name, username, and password. Do not paste a connection URL into a
   command, documentation, issue, or chat.
3. Install PostgreSQL client tools matching the database's major version.
4. Enter the non-secret connection fields as command options and let `pg_dump`
   prompt for the password. The password then enters neither shell history nor
   process arguments, exported environment, documentation, or normal command
   output. Replace every angle-bracket placeholder; never copy a real value into
   this file.

```bash
if pg_dump \
  --password \
  --host='<external-database-host>' \
  --port='<database-port>' \
  --username='<database-user>' \
  --dbname='<database-name>' \
  --format=custom \
  --file='<absolute-path-outside-repository>/hungry-4-joy-YYYYMMDDTHHMMSSZ.dump'
then
  printf 'pg_dump completed successfully.\n'
else
  printf 'pg_dump failed; do not retain or use the partial output.\n' >&2
  false
fi
```

5. Confirm `pg_dump` exited successfully. Record a checksum and file size in
   the private recovery inventory; do not print or inspect donor rows.
6. Verify the archive structure without extracting its data:

```bash
pg_restore --list '<absolute-path-outside-repository>/hungry-4-joy-YYYYMMDDTHHMMSSZ.dump' >/dev/null
```

7. A dump is not verified until it has been restored to a separate empty test
   database and application-level checks pass. Delete the test target according
   to the private retention policy after the drill.

The root `.gitignore` excludes common database/export formats and backup
directories, but ignore rules are only a guardrail. Always choose a destination
outside the checkout.

## Restore a logical dump

Restore into a new, empty database. Do not overwrite the current database and
do not use `--clean` against a database that contains important data.

1. Establish a verified write freeze as described in **Write containment**
   below. Do not begin a consistency-sensitive cutover until every public and
   operator mutation path is blocked.
2. Create a separate empty Postgres target with a compatible PostgreSQL major
   version and network access policy.
3. Verify the dump checksum against the private recovery inventory.
4. Let `pg_restore` prompt for the target password. As with backup, only the
   non-secret host, port, user, and database fields appear as options:

```bash
if pg_restore \
  --password \
  --host='<new-database-host>' \
  --port='<database-port>' \
  --username='<database-user>' \
  --dbname='<empty-database-name>' \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  '<absolute-path-outside-repository>/hungry-4-joy-YYYYMMDDTHHMMSSZ.dump'
then
  printf 'pg_restore completed successfully.\n'
else
  printf 'pg_restore failed; keep the target isolated for investigation.\n' >&2
  false
fi
```

5. Validate the restored target before cutover:
   - use a controlled local checkout or a nonstandard, non-public validation
     container command that does **not** invoke
     `middleware-api/bin/render-start.sh`;
   - configure the target connection privately and run
     `php artisan migrate --pretend --force` first;
   - review the proposed SQL and resolve code/schema compatibility before
     deliberately applying any migration;
   - check `/api/health`, operator-protected readiness, representative dashboard
     reads, expected record counts, latest timestamps, and idempotency keys;
   - perform no provider mutation during validation; and
   - record the dump timestamp so the accepted data-loss window is explicit.
6. Before cutover, reconcile the target with the authoritative Blueprint using
   **Database reference ownership** below. Update both Render and the reviewed
   `render.yaml` strategy under the write freeze; do not rely on a dashboard-only
   override.
7. Deploy a revision explicitly approved for the restored schema. The
   production entrypoint runs `php artisan migrate --force` automatically before
   serving traffic, so never use it for initial inspection. A service rollback
   does not change database state or undo migrations.
8. Verify health and read paths before re-enabling webhook delivery. Refeed only
   known missing signed provider events, using idempotency behavior and a
   documented time window to avoid duplicates.
9. Keep the old database isolated until the new target is accepted; then apply
   the private retention/deletion decision.

### Database reference ownership

The checked-in Blueprint currently sets middleware `DB_URL` with a
`fromDatabase` reference to `hungry-4-joy-middleware-db`. A manual environment
override in the Render Dashboard does not update that source of truth. A later
Blueprint sync can reconnect the middleware to the old database while
`render.yaml` still contains that reference.

Before cutover, record whether the restored target will be Blueprint-managed
and choose one reviewed strategy:

- **Blueprint-managed target:** update both the database resource name and the
  middleware `DB_URL.fromDatabase.name` reference in `render.yaml`. Confirm in
  Render's Blueprint preview that the existing restored target can be managed
  as intended and that the sync will not create, replace, or delete an
  unexpected database.
- **Separately managed target:** replace the checked-in `fromDatabase` wiring
  with an explicitly reviewed secret/reference strategy such as
  `DB_URL` declared `sync: false`, then set the value privately in Render. The
  connection URL never belongs in the Blueprint, Git diff, issue, or log.

Validate the Blueprint preview before sync and have another operator review the
database resource, service reference, and proposed creates/deletes. Abort on
unexpected resource changes. After cutover—and after every later Blueprint
sync—confirm in Render that middleware `DB_URL` resolves from the intended
resource/reference without revealing its value. Corroborate with middleware
readiness, expected restored record counts/timestamps, and a middleware
connection visible on the intended database; confirm that the isolated old
database is not receiving new connections or writes.

Reverting to the isolated old database requires the same write freeze,
code/schema compatibility decision, reviewed `render.yaml` reference strategy,
Blueprint preview, deployment, and post-sync target verification. Never switch
only the Dashboard value and leave the Blueprint pointing elsewhere.

### Write containment

Production writes do not come only from Foxy. The public
`POST /api/checkout/handoffs` route registers browser handoffs, the signed
`POST /api/foxy/webhooks` route ingests provider events, and authenticated
dashboard/direct reconcile and CRM-retry routes mutate data or provider state.
Disabling the Foxy webhook blocks only one of those paths.

The current repository has no route-specific maintenance flag or read-only
mode. The current free Render web service also cannot use Render maintenance
mode, which Render limits to paid web services. Therefore, the hosted free demo
cannot claim a consistent online restore/cutover procedure today. Before a
consistency-sensitive cutover, use one of these reviewed controls:

- temporarily run the middleware as a paid web service and enable Render
  maintenance mode, which returns `503` for all public requests; or
- first implement and deploy an application/edge write deny that covers every
  route listed above while preserving only explicitly approved reads.

Do not substitute disabling the dashboard UI, CORS, or the Foxy webhook for a
write freeze. Verify containment through both the direct middleware host and
the dashboard `/api` proxy: public handoff, signed webhook, reconciliation, and
CRM retry requests must not reach controller logic or change row counts. Keep
the freeze active until the restored target and compatible middleware are live.

Record the dump timestamp and freeze timestamp. Writes accepted after the dump
are expected drift, not part of that recovery point. After cutover, inventory
Foxy events in that window and refeed/reconcile only known missing events under
the existing idempotency rules. Browser handoffs that existed only after the
dump might not be reproducible; document that loss against the accepted RPO
instead of fabricating records.

Source: [Render maintenance mode](https://render.com/docs/maintenance-mode).

For a paid Render database, prefer Render point-in-time recovery for data-loss
incidents. Render creates a separate recovery instance for validation and
cutover. Paid PITR recovery windows depend on the workspace plan. Render-created
logical exports are retained for seven days and must be downloaded for longer
retention. These features are not available to the current free database.

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
custom domains, or database contents. Ordinary service environment variables
match the target deploy for the rollback and can therefore reactivate older
database references, credentials, tokens, or feature flags. Render does not
replace the service's currently saved configuration, which a later standard
deploy uses. Environment-group values remain current, although which groups are
attached can match the target deploy.

Before confirming a rollback, compare environment-variable **names and private
version/change records**, never values in an issue or log. Explicitly confirm
the intended `DB_URL` database reference, `APP_KEY`, operator token, Foxy
credential generation, and enabled integration flags. Repeat the check on the
running rollback. Reapply or rotate current credentials in Render and redeploy
when the target deploy's values are no longer safe or compatible. Do not assume
that a code rollback preserves the intended database target or current secret
generation. Reconcile `DB_URL` with **Database reference ownership** before any
later Blueprint sync; a dashboard-only correction can be overwritten by the
checked-in `fromDatabase` reference.

Sources: [Render rollbacks](https://render.com/docs/rollbacks) and
[Render free-service limitations](https://render.com/docs/free).

### Service-specific procedure

| Surface | Rollback or recovery action | Required verification |
| --- | --- | --- |
| Middleware | Choose a database-compatible deploy. Roll back the Render service for containment, then create a reviewed Git revert for the durable fix. | Public liveness; protected readiness; migrations; webhook signature rejection/acceptance; representative dashboard reads; no duplicate CRM or checkout records |
| Database | Do not expect a service rollback to reverse migrations or writes. Choose PITR (paid only), restore a logical dump to a separate target, or write a reviewed forward repair. | Schema compatibility, counts/timestamps, idempotency, application reads, accepted RPO |
| Dashboard | Roll back to a compatible static build. It has no database or persistent runtime state. | Page load, seeded view, operator lock/unlock, authenticated API reads, no token in bundle or storage |
| WordPress | Redeploy a known-good image/commit and allow startup reseeding. Do not attempt to preserve runtime SQLite, uploads, plugins, or admin edits. | Campaign page, donation links and metadata, middleware handoff registration, admin access only if needed |
| Queue worker | None is provisioned. If added later, stop it before incompatible schema/code changes and deploy the same compatible revision as middleware before resuming. | Queue connection, failed jobs, idempotency, provider side effects |
| Scheduler / cron | None is provisioned. Scheduled reconciliation remains off by default. If added later, pause it during recovery and resume only with compatible middleware/schema. | Schedule inventory, one controlled run, duplicate protection, next-run timing |

For a cross-service release, a conservative order is:

1. Establish and verify the whole-service/route write containment described
   above; pausing provider delivery alone is insufficient.
2. Decide the database state and compatible middleware version first.
3. Restore or repair the database if required, then deploy middleware.
4. Verify middleware health and protected reads.
5. Deploy the compatible dashboard and WordPress revisions.
6. Re-enable provider delivery and perform one controlled end-to-end demo.
7. Re-enable automatic deploys after the Git history contains the durable fix.

## Environment recovery inventory

Record owners and setup instructions, never values. `render.yaml` is the
authoritative checked-in inventory for Blueprint wiring and non-secret defaults.

| Surface | Environment names / provider configuration | Owner |
| --- | --- | --- |
| WordPress | `WP_ADMIN_PASSWORD`, `WP_ADMIN_EMAIL`; Foxy settings represented by repository-owned seeded content | Deployment administrator / Foxy administrator |
| Middleware application | `APP_KEY`, `APP_URL`, `DASHBOARD_OPERATOR_TOKEN` | Deployment administrator |
| Database | `DB_URL` currently supplied by `render.yaml` through the `hungry-4-joy-middleware-db` reference; any restored-target strategy must update this source of truth | Render / deployment administrator |
| Foxy | `FOXY_WEBHOOK_ENCRYPTION_KEY`, `FOXY_CLIENT_ID`, `FOXY_CLIENT_SECRET`, `FOXY_REFRESH_TOKEN`, `FOXY_STORE_ID`; webhook URL/event settings in Foxy | Foxy administrator |
| Dashboard | `MIDDLEWARE_API_TARGET` supplied through Render service wiring; no operator token belongs here | Render / deployment administrator |

HubSpot is disabled by default in the current Blueprint. If enabled later, add
the exact environment-variable names from `middleware-api/.env.example` to the
private recovery inventory and assign a HubSpot credential owner. Never copy
provider values into this runbook, Git, CI logs, or incident notes.

## Incident decision guide

| Symptom | First choice | Avoid |
| --- | --- | --- |
| New code fails; schema is still compatible | Roll back the affected Render service, then create a Git revert | Restoring the database without evidence of data damage |
| Migration and old code are incompatible | Contain writes and select a compatible code/schema pair; use a reviewed forward repair or isolated database restore | Assuming Render service rollback reverses the migration |
| Accidental data loss on free Postgres | Restore the latest verified logical dump to a separate database | Overwriting the only database or claiming PITR exists |
| Free Postgres expired less than 14 days ago | Upgrade it to a paid instance to regain access, then immediately establish backups | Waiting until the deletion deadline |
| Free Postgres grace period ended | Create a new database, migrate schema, and restore the latest verified dump if available | Expecting Render to recover deleted free data |
| WordPress runtime content disappeared | Redeploy/reseed from Git | Treating ephemeral admin edits or uploads as backed up |
| Dashboard-only rendering failure | Roll back/redeploy the dashboard build | Changing middleware or database state without evidence |

## Future work—not implemented

- Upgrade persistent demo data to paid Postgres before the free-instance expiry.
- Automate encrypted off-site logical dumps with retention and failure alerts.
- Define a named backup owner, schedule, retention period, and deletion process.
- Run and record scheduled restore drills against isolated targets.
- Add database-expiration and backup-age monitoring.
- Adopt paid PITR when recovery guarantees become necessary.
- Add worker/cron recovery procedures only if those services are actually
  provisioned.

Until those items are implemented and tested, the project must not claim
automated backups, point-in-time recovery, or a guaranteed recovery window.
