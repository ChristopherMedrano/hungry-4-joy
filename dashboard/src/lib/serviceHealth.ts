import type {
  HealthReadyResponse,
  ServiceBannerState,
  ServiceBannerStatus,
  ServiceKey,
} from '../types/health'

export const serviceBannerOrder: ServiceKey[] = ['wordpress', 'hubspot', 'foxy', 'laravel']

const serviceLabels: Record<ServiceKey, string> = {
  wordpress: 'WordPress',
  hubspot: 'HubSpot',
  foxy: 'Foxy',
  laravel: 'Laravel',
}

function laravelStatus(health: HealthReadyResponse): ServiceBannerStatus {
  const { api, database, migrations, queue } = health.checks

  if (
    database.status === 'failed' ||
    migrations.status === 'failed' ||
    api.status === 'failed' ||
    queue.status === 'failed' ||
    queue.failed_jobs > 0
  ) {
    return 'error'
  }

  return 'healthy'
}

function foxyStatus(health: HealthReadyResponse): ServiceBannerStatus {
  const webhook = health.checks.foxy_webhook.status
  const api = health.checks.foxy_api.status

  if (webhook === 'configured' && api === 'configured') {
    return 'healthy'
  }

  if (webhook === 'not_configured' && api === 'not_configured') {
    return 'disabled'
  }

  return 'error'
}

function hubspotStatus(health: HealthReadyResponse): ServiceBannerStatus {
  switch (health.checks.hubspot.status) {
    case 'enabled':
      return 'healthy'
    case 'disabled':
      return 'disabled'
    case 'not_configured':
      return 'error'
  }
}

function wordpressStatus(health: HealthReadyResponse): ServiceBannerStatus {
  switch (health.checks.wordpress.status) {
    case 'ok':
      return 'healthy'
    case 'disabled':
      return 'disabled'
    case 'failed':
      return 'error'
  }
}

function serviceTitle(key: ServiceKey, health: HealthReadyResponse): string {
  switch (key) {
    case 'laravel':
      return [
        health.checks.api.summary,
        health.checks.database.summary,
        health.checks.migrations.summary,
        health.checks.queue.summary,
      ].join(' ')
    case 'foxy':
      return `${health.checks.foxy_webhook.summary} ${health.checks.foxy_api.summary}`
    case 'hubspot':
      return health.checks.hubspot.summary
    case 'wordpress':
      return health.checks.wordpress.summary
  }
}

export function deriveServiceBannerStates(
  health: HealthReadyResponse | null,
  options?: { unreachable?: boolean },
): ServiceBannerState[] {
  if (!health || options?.unreachable) {
    return serviceBannerOrder.map((key) => ({
      key,
      label: serviceLabels[key],
      status: key === 'laravel' ? 'error' : 'disabled',
      title:
        key === 'laravel'
          ? 'Middleware API is unreachable.'
          : `${serviceLabels[key]} status unavailable until middleware responds.`,
    }))
  }

  const statusByKey: Record<ServiceKey, ServiceBannerStatus> = {
    wordpress: wordpressStatus(health),
    hubspot: hubspotStatus(health),
    foxy: foxyStatus(health),
    laravel: laravelStatus(health),
  }

  return serviceBannerOrder.map((key) => ({
    key,
    label: serviceLabels[key],
    status: statusByKey[key],
    title: serviceTitle(key, health),
  }))
}
