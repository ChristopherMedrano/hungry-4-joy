# Repository Safety Audit

Use this checklist before a release and whenever environment examples, hosted
configuration, fixtures, exports, backups, or screenshots change. It checks
tracked repository content and Git metadata. It is not a substitute for a
dedicated secret scanner or a review of provider-side configuration.

## Safety rules

- Never open, print, parse, copy, hash, or scan local `.env`, credential, token,
  OAuth, private-key, database, export, backup, or runtime files for this audit.
- Use `git ls-files` and `git grep` so content checks are limited to tracked
  files. Report candidate location and category, not the matched value.
- Treat every candidate as unverified until its context is reviewed. Demo card
  data, empty placeholders, fixture rejection tests, public service URLs, and
  dependency lockfile hashes are expected false positives in broad scans.
- If a real secret may have entered Git, do not paste it into an issue or log.
  Stop, rotate/revoke it at the provider, and coordinate history remediation.
- Treat database dumps and exports as sensitive even when they contain only
  demo records. Create and retain them outside the repository; see
  [`backup-restore-rollback.md`](backup-restore-rollback.md).

## Expected tracked configuration

- `middleware-api/.env.example` contains empty or local-only placeholders.
- `wordpress/wp-config-render.php` reads sensitive values from the environment.
- `render.yaml` declares hosted secrets with `sync: false`; it does not contain
  their values.
- `docs/images/` contains intentional seeded-demo screenshots. Private review
  captures belong under `private-screenshots/` or `screenshots/private/`, which
  are ignored. Review image contents manually before intentionally adding them.

The Render WordPress start command generates missing authentication keys and
salts once per container process and exports them before WordPress starts.
Explicit environment values take precedence. Because the demo filesystem is
ephemeral, a container restart can invalidate existing administrator sessions.
The administrator password is supplied to WP-CLI through its prompted standard
input, not through a process argument or normal command output.

## Metadata and ignore checks

Inventory tracked environment- and runtime-like names without reading content:

```bash
git ls-files \
  | rg -i '(^|/)(\.env($|\.)|wp-config|.*(credential|secret|token|oauth).*|.*\.(pem|key|p12|pfx|jks|keystore|sqlite|sqlite3|db|sql|dump|pgdump|bak|backup)$|.*\.dir\.tar\.gz$|uploads?/|cache/)'
```

Repeat the filename-only check across history:

```bash
git log --all --name-only --pretty=format: \
  | sed '/^$/d' \
  | sort -u \
  | rg -i '(^|/)(\.env($|\.)|wp-config\.php$|.*(credential|secret|token|oauth).*|.*\.(pem|key|p12|pfx|jks|keystore|sqlite|sqlite3|db|sql|dump|pgdump|bak|backup)$|.*\.dir\.tar\.gz$|uploads?/|cache/)'
```

Find tracked paths that now match an ignore rule:

```bash
git ls-files -ci --exclude-standard
```

The release-ready repository should return no tracked ignored paths. Treat any
listed planning, environment, credential, private-key, runtime, export, backup,
or configuration file as an unexpected conflict that must be reviewed. The
known-safe tracked `middleware-api/.npmrc` is explicitly exempted from the root
`.npmrc` rule.

Confirm representative local paths are ignored. `--no-index` also tests paths
that do not currently exist:

```bash
for path in \
  .archive/docs/plan.md .env.production production.env.local credentials.json private.pem dump.sql snapshot.sqlite \
  backup.pgdump render-export.dir.tar.gz backups/local.backup exports/donors.csv private-screenshots/review.png \
  screenshots/private/donor.png wordpress/wp-content/uploads/private.jpg \
  wordpress/wp-content/cache/object-cache.php \
  middleware-api/storage/logs/laravel.log \
  middleware-api/storage/app/private/export.csv
do
  git check-ignore -q --no-index "$path" || printf 'NOT IGNORED: %s\n' "$path"
done
```

Inspect unusual tracked modes and symlinks:

```bash
git ls-files -s \
  | awk '$1 != "100644" && $1 != "100755" { print $1, $4 }'
```

Only expected executable scripts should use mode `100755`; investigate mode
`120000` symlinks and mode `160000` Git links before release.

## Redacted tracked-content checks

This high-confidence pattern check prints only filename, line number, and a
category. An empty result means those patterns were not found in the searched
tracked text; it does not prove that no secret exists.

```bash
git grep -nIE \
  -e \
  '-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{10,}|https?://[^/@[:space:]]+:[^/@[:space:]]+@' \
  -- . \
  ':(exclude)package-lock.json' \
  ':(exclude)dashboard/package-lock.json' \
  ':(exclude)middleware-api/composer.lock' \
  | awk -F: '{ print $1 ":" $2 ": credential-pattern candidate" }'
```

Review forbidden payment-field markers without printing their values:

```bash
git grep -nIE \
  -e \
  'card_number|cardnumber|cvv|cvc|security_code|payment_method_secret|raw_payment|payment_credential' \
  -- . \
  | awk -F: '{ print $1 ":" $2 ": payment-field marker" }'
```

Expected matches are safety documentation, rejection lists, and negative tests.
No accepted fixture, stored model field, API response, log payload, or analytics
payload may contain those fields. The public Foxy sandbox card shown in demo
documentation is intentionally tracked; real payment data is never permitted.

Check for private-network URLs without displaying the complete matching line:

```bash
git grep -nIE \
  -e \
  '(10\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|(192\.168\.[0-9]{1,3}\.[0-9]{1,3})|(172\.(1[6-9]|2[0-9]|3[01])\.[0-9]{1,3}\.[0-9]{1,3})' \
  -- . \
  | awk -F: '{ print $1 ":" $2 ": private-network candidate" }'
```

Localhost examples are allowed. Any other candidate needs a context review to
determine whether it exposes private infrastructure.

## Release result

Record the commit reviewed, exact scan coverage, candidate categories and
locations, resolved false positives, and any remaining assumptions. Also run:

```bash
git diff --check
```

Do not state that the repository contains no secrets. State that the named
tracked-file and metadata checks found no unresolved candidates at the reviewed
commit and note that ignored files, provider configuration, and undiscovered
patterns were outside coverage.
