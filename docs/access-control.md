# Access Control And Operator Token

Hungry-4-Joy is a public portfolio demo, but its support data and provider-triggering actions are not public APIs. The demo uses one bounded operator bearer token rather than a user directory, SSO, OAuth login, or multi-user RBAC.

## Endpoint boundary

| Caller | Public endpoints | Protected endpoints |
| --- | --- | --- |
| Anonymous donor/browser | `GET /api/health`, `POST /api/checkout/handoffs` | None |
| Foxy webhook sender | Signed `POST /api/foxy/webhooks` | None |
| Support operator | Public endpoints | All `/api/dashboard/*`, `POST /api/checkout/handoffs/reconcile`, `GET /api/health/ready` |

The local fixture receiver, `POST /api/checkout/events`, remains unavailable in production. Foxy webhook authentication continues to use its own signature; it does not use the operator token.

Protected requests must use the exact form `Authorization: Bearer <token>`. Missing, malformed, invalid, and server-unconfigured credentials receive the same generic `401` response and `WWW-Authenticate: Bearer` header. An absent `DASHBOARD_OPERATOR_TOKEN` therefore fails closed. CORS remains an allowlist for browser origins, not an authorization control.

Public handoff registration (300/minute), Foxy webhooks (600/minute), failed operator authentication (60/minute), authenticated operator reads (120/minute), and operator mutations (10/minute) have separate demo limits. These are fixed service-wide buckets: valid credentials neither consume nor are blocked by the authentication-failure bucket. Throttling runs before provider or database work relevant to the limited request. Normal Laravel `429 Too Many Requests` responses apply.

[Render documents](https://render.com/articles/how-render-handles-ddos-attacks#reading-the-true-client-ip) that the application sees a proxy address by default and the real address is carried in `X-Forwarded-For`. [Laravel documents](https://laravel.com/framework/docs/12.x/requests#configuring-trusted-proxies) that forwarded addresses become authoritative only when the relevant proxy is trusted. This repository has no verified, fixed Render proxy CIDR, and the dashboard nginx proxy appends its own forwarded-address hop. It therefore intentionally does **not** trust all proxies or use a client-supplied forwarded header for security decisions. Fixed service-wide limiter keys avoid spoofable identity. The higher public thresholds reduce the chance that one ordinary client can deny all donors, but a distributed or sustained flood still requires Render edge controls or a shared edge-aware rate limiter; that deployment assumption is not claimed as solved here.

## Role and ownership matrix

| Role | Permitted scope | Credential owner / boundary |
| --- | --- | --- |
| Anonymous donor | Campaign pages, Foxy checkout, public handoff registration, basic liveness | No project credential |
| Foxy webhook sender | Signed webhook delivery only | Foxy webhook signing secret is held by Foxy and the middleware runtime |
| Support operator | Unlock the dashboard; inspect safe support records/readiness; run bounded retry/reconciliation actions | Operator token shared only through an approved private channel |
| WordPress administrator | WordPress content and demo-site administration | WordPress admin credential; no implied dashboard or provider access |
| GitHub maintainer | Repository, review, and CI administration | GitHub account permissions; no implied runtime secret access |
| Render/deployment administrator | Service configuration, secret injection, deployment, and rotation | Render account/team permissions |
| HubSpot/Foxy credential owner | Provider application credentials, scopes, webhook configuration, and revocation | Provider accounts; credentials are injected only into middleware runtime |

One person may hold multiple roles, but each credential grants only its listed boundary. GitHub access, CORS origin membership, or access to the public dashboard shell does not grant operator access.

## Provisioning and rotation

Generate a high-entropy token on a trusted machine, for example with `openssl rand -base64 32`. Do not paste the result into source, `.env.example`, `render.yaml`, Vite variables, screenshots, issues, chat, logs, or URLs.

1. A Render/deployment administrator sets `DASHBOARD_OPERATOR_TOKEN` on the middleware service. The Blueprint declares it with `sync: false`; no value is checked in.
2. Share it with the intended support operator through an approved private channel.
3. The operator enters it into the dashboard unlock form. It is retained in JavaScript memory only, sent in the Authorization header, and cleared on **Lock**, switching to Seeded/preview mode, refresh, tab close, or any `401` response. Clearing or replacing it aborts in-flight requests and invalidates responses from the previous access generation.
4. To rotate, generate a new token, update the middleware secret, deploy/restart the middleware as required, privately distribute the replacement, and revoke the old value by completing the runtime update.

Do not configure the token on the dashboard service. Anything exposed through `VITE_*` is public build output.

The public dashboard shell and Seeded view remain portfolio-visible without credentials. Live API/readiness data and all live actions require an unlock. This is intentionally a small demo support boundary; full SSO and multi-user RBAC are deferred until the project has real user-management requirements.

## Verification

Automated coverage verifies generic rejection, fail-closed configuration, protected-route inheritance, public route availability, signature-governed webhooks, and rate-limit side-effect boundaries:

```bash
cd middleware-api
php artisan test --filter=OperatorAccessControlTest
```

After an authorized secret update and deployment, open the dashboard and verify that Live API starts locked, an invalid token returns to the unlock prompt, a valid token loads readiness/data, **Lock** removes access, and Seeded view remains available without a token. Never put a token in a curl URL, command history, browser address bar, or captured output.
