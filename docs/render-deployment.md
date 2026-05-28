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

This service uses the WordPress.org SQLite Database Integration plugin instead of MySQL. It is intended only for a disposable demo. Render free web services use an ephemeral filesystem, so WordPress admin edits, uploads, plugin installs, and SQLite data can be lost on redeploy, restart, or spin-down. The container seeds the demo site on startup so the campaign page can come back without a paid MySQL/private service.

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

The future Foxy webhook target is:

```text
https://<middleware-render-host>/api/checkout/events
```

Do not configure Foxy production webhooks until signature verification is implemented.

## References

- Render Laravel Docker guide: https://render.com/docs/deploy-php-laravel-docker
- Render free service limitations: https://render.com/docs/free
- Render WordPress guide: https://render.com/docs/deploy-wordpress
- Render Blueprint reference: https://render.com/docs/blueprint-spec
- WordPress SQLite Database Integration plugin: https://wordpress.org/plugins/sqlite-database-integration/
