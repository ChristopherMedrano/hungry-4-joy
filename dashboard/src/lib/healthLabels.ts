import type { HealthCheckKey, HealthChecks, OverallHealthStatus } from '../types/health'

export const healthCheckOrder: HealthCheckKey[] = [
  'api',
  'database',
  'migrations',
  'foxy_webhook',
  'foxy_api',
  'hubspot',
  'wordpress',
  'queue',
]

export const overallHealthLabels: Record<OverallHealthStatus, string> = {
  ok: 'Healthy',
  degraded: 'Degraded',
  down: 'Down',
}

export const overallHealthTone: Record<
  OverallHealthStatus,
  'emerald' | 'amber' | 'rose'
> = {
  ok: 'emerald',
  degraded: 'amber',
  down: 'rose',
}

export function healthCheckStatusLabel(
  key: HealthCheckKey,
  status: HealthChecks[HealthCheckKey]['status'],
): string {
  if (key === 'hubspot') {
    switch (status) {
      case 'enabled':
        return 'Enabled'
      case 'disabled':
        return 'Disabled'
      case 'not_configured':
        return 'Not configured'
    }
  }

  if (key === 'foxy_webhook' || key === 'foxy_api') {
    return status === 'configured' ? 'Configured' : 'Not configured'
  }

  if (key === 'wordpress') {
    switch (status) {
      case 'ok':
        return 'OK'
      case 'disabled':
        return 'Disabled'
      case 'failed':
        return 'Failed'
    }
  }

  return status === 'ok' ? 'OK' : 'Failed'
}

export function healthCheckBadgeTone(
  _key: HealthCheckKey,
  status: HealthChecks[HealthCheckKey]['status'],
): 'emerald' | 'amber' | 'rose' | 'slate' {
  if (status === 'ok' || status === 'configured' || status === 'enabled') {
    return 'emerald'
  }

  if (status === 'disabled') {
    return 'slate'
  }

  if (status === 'not_configured') {
    return 'amber'
  }

  return 'rose'
}

export const healthCheckRemediation: Record<HealthCheckKey, string> = {
  api: 'Confirm middleware is running (`php artisan serve` locally or the Render web service).',
  database:
    'Verify `DB_*` settings in middleware `.env` and that the database is reachable.',
  migrations:
    'Run `php artisan migrate` in middleware-api to create required tables.',
  foxy_webhook:
    'Set `FOXY_WEBHOOK_ENCRYPTION_KEY` in middleware `.env` for signed webhook intake.',
  foxy_api:
    'Set `FOXY_CLIENT_ID`, `FOXY_CLIENT_SECRET`, `FOXY_REFRESH_TOKEN`, and `FOXY_STORE_ID` for reconcile and by-cart lookup.',
  hubspot:
    'Set `HUBSPOT_ENABLED=true` and `HUBSPOT_ACCESS_TOKEN` when live CRM sync is required.',
  wordpress:
    'Set `WORDPRESS_SITE_URL` in middleware `.env` to the public campaign site URL.',
  queue:
    'Review `QUEUE_CONNECTION` and inspect `failed_jobs` when using an async queue driver.',
}
