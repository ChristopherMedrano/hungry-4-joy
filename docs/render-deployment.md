# Render Deployment

This project should deploy to Render as separate services:

- Laravel middleware/API as a Render Web Service.
- WordPress as a separate demo Render Web Service using SQLite.

Keeping them separate preserves the project boundary: WordPress owns campaign content and demo cart links, while Laravel owns checkout event receipt and integration state.

## WordPress Demo Site

The WordPress demo service is defined in the root [`render.yaml`](../render.yaml) Blueprint.

Render resources:

- Web service: `hungry-4-joy-wordpress`
- Runtime: Docker
- Docker root: `wordpress/`
- Container port: `80`
- Health check: `/`
- Public URL: `https://hungry-4-joy-wordpress.onrender.com`

This service uses the WordPress.org SQLite Database Integration plugin instead of MySQL. This is intentional for the hosted demo: persistence is not required, and using temporary SQLite avoids paying for a private Render service or separate database just to show the campaign page and Foxy handoff. Render free web services use an ephemeral filesystem, so WordPress admin edits, uploads, plugin installs, and SQLite data can be lost on redeploy, restart, or spin-down. The container seeds the demo site on startup so the campaign page can come back without paid database infrastructure.

Set these secrets during Blueprint sync:

| Key | Value |
| --- | --- |
| `WP_ADMIN_PASSWORD` | A generated demo admin password |
| `WP_ADMIN_EMAIL` | The demo admin email address |

After deploy, verify:

```bash
curl https://hungry-4-joy-wordpress.onrender.com
```

Then open:

```text
https://hungry-4-joy-wordpress.onrender.com/wp-admin
```

Use the configured `WP_ADMIN_USER` and `WP_ADMIN_PASSWORD` values. Do not store real donor data, production content, or irreplaceable media uploads in this demo service.

## Middleware/API

The middleware service is defined in the root [`render.yaml`](../render.yaml) Blueprint.

Render resources:

- Web service: `hungry-4-joy-middleware`
- Postgres database: `hungry-4-joy-middleware-db`
- Runtime: Docker
- Docker root: `middleware-api/`
- Health check: `/api/health`

Set these secrets during Blueprint creation:

| Key | Value |
| --- | --- |
| `APP_KEY` | Output of `cd middleware-api && php artisan key:generate --show` |
| `APP_URL` | The Render service URL, such as `https://hungry-4-joy-middleware.onrender.com` |
| `FOXY_WEBHOOK_ENCRYPTION_KEY` | Foxy JSON webhook encryption key |

Render injects the Postgres connection string into `DB_URL` from the Blueprint database reference.

After the service is live, verify:

```bash
curl https://<middleware-render-host>/api/health
```

Expected response:

```json
{
  "service": "hungry-4-joy-middleware-api",
  "status": "ok"
}
```

The Foxy JSON webhook target is:

```text
https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
```

The fixture receiver is local/test-only and intentionally returns `404` in production:

```text
POST /api/checkout/events
```

Do not enable the Foxy webhook until `FOXY_WEBHOOK_ENCRYPTION_KEY` is set in Render.

### Foxy JSON webhook activation

The hosted middleware accepts live Foxy checkout events at:

```text
POST https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks
```

**Activate** (one-time setup in Foxy practice portal + Render):

| Setting | Value |
| --- | --- |
| URL | `https://hungry-4-joy-middleware.onrender.com/api/foxy/webhooks` |
| Format | JSON |
| Resource | transaction |
| Event | created |
| Query | `zoom=items,items:item_options` |
| Encryption key | Generate in Foxy; paste into Render as `FOXY_WEBHOOK_ENCRYPTION_KEY` |

Foxy sends `Foxy-Webhook-Event` and `Foxy-Webhook-Signature` (HMAC-SHA256 of the raw body). Laravel rejects unsigned or mismatched signatures before ingest.

**Verify after activation:**

```bash
curl https://hungry-4-joy-middleware.onrender.com/api/health
curl https://hungry-4-joy-middleware.onrender.com/api/dashboard/events
cd middleware-api && php artisan test --filter=FoxyWebhook
```

Run a test donation from `https://hungry-4-joy-wordpress.onrender.com` through the Foxy demo cart. Confirm a new dashboard row with `ingest.channel = foxy_webhook` and `event_id` prefixed `foxy_transaction_`.

**Rollback / disable:**

1. Deactivate or delete the webhook in the Foxy portal.
2. Optionally remove or rotate `FOXY_WEBHOOK_ENCRYPTION_KEY` in Render (stray posts then return `signature_invalid`).
3. Restart or redeploy the middleware service after env changes.
4. Confirm `/api/dashboard/events` stops receiving new `foxy_webhook` rows.

See `docs/foxy-middleware-connection-plan.md` (Phase 2) for duplicate replay (`duplicate_ignored`) and `donation_attempt_id` behavior.

## References

- Render Laravel Docker guide: https://render.com/docs/deploy-php-laravel-docker
- Render free service limitations: https://render.com/docs/free
- Render WordPress guide: https://render.com/docs/deploy-wordpress
- Render Blueprint reference: https://render.com/docs/blueprint-spec
- WordPress SQLite Database Integration plugin: https://wordpress.org/plugins/sqlite-database-integration/
