# Render Deployment

This project should deploy to Render as separate services:

- Laravel middleware/API as a Render Web Service.
- WordPress as a separate Render WordPress service with MySQL and persistent storage.

Keeping them separate preserves the project boundary: WordPress owns campaign content and demo cart links, while Laravel owns checkout event receipt and integration state.

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

## WordPress

Render's WordPress deployment path is separate from this middleware Blueprint. Render's guide uses:

- A Docker WordPress web service.
- MySQL 8.
- A Render disk mounted for persistent WordPress files.

Use the project-owned child theme files under:

```text
wordpress/wp-content/themes/hungry-4-joy/
```

The recommended next step is a dedicated WordPress deployment slice that decides whether to:

- Use Render's WordPress template and manually install or upload the child theme.
- Build a small WordPress Docker image from this repo that copies the child theme into the WordPress image.

For the first hosted webhook demo, deploy the middleware service first. WordPress can remain local or be deployed separately after the public middleware URL is stable.

## References

- Render Laravel Docker guide: https://render.com/docs/deploy-php-laravel-docker
- Render WordPress guide: https://render.com/docs/deploy-wordpress
- Render Blueprint reference: https://render.com/docs/blueprint-spec
