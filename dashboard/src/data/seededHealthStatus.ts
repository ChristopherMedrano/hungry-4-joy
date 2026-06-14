import type { HealthReadyResponse } from '../types/health'

export const seededHealthStatus: HealthReadyResponse = {
  service: 'hungry-4-joy-middleware-api',
  status: 'degraded',
  checked_at: '2026-06-12T10:00:00+00:00',
  checks: {
    api: {
      status: 'ok',
      label: 'Middleware API',
      summary: 'API process is responding.',
    },
    database: {
      status: 'ok',
      label: 'Database',
      summary: 'Database connection succeeded.',
    },
    migrations: {
      status: 'ok',
      label: 'Migrations',
      summary: 'Required tables are present.',
    },
    foxy_webhook: {
      status: 'configured',
      label: 'Foxy webhook',
      summary: 'Webhook encryption key is set.',
    },
    foxy_api: {
      status: 'not_configured',
      label: 'Foxy hAPI',
      summary: 'OAuth credentials are not fully set.',
    },
    hubspot: {
      status: 'disabled',
      label: 'HubSpot sync',
      summary: 'HubSpot sync is disabled for this environment.',
    },
    wordpress: {
      status: 'disabled',
      label: 'WordPress',
      summary: 'WordPress site URL is not configured for readiness checks.',
    },
    queue: {
      status: 'ok',
      label: 'Queue',
      summary: 'Queue driver: sync.',
      driver: 'sync',
      failed_jobs: 0,
    },
  },
}
