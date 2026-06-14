export type RuntimeHealthStatus = 'ok' | 'failed'

export type IntegrationHealthStatus = 'configured' | 'not_configured'

export type HubSpotHealthStatus = 'enabled' | 'disabled' | 'not_configured'

export type WordPressHealthStatus = 'ok' | 'failed' | 'disabled'

export type OverallHealthStatus = 'ok' | 'degraded' | 'down'

export type HealthCheckKey =
  | 'api'
  | 'database'
  | 'migrations'
  | 'foxy_webhook'
  | 'foxy_api'
  | 'hubspot'
  | 'wordpress'
  | 'queue'

export type ServiceKey = 'wordpress' | 'hubspot' | 'foxy' | 'laravel'

export type ServiceBannerStatus = 'healthy' | 'error' | 'disabled'

export interface HealthCheckBase {
  label: string
  summary: string
}

export interface RuntimeHealthCheck extends HealthCheckBase {
  status: RuntimeHealthStatus
}

export interface IntegrationHealthCheck extends HealthCheckBase {
  status: IntegrationHealthStatus
}

export interface HubSpotHealthCheck extends HealthCheckBase {
  status: HubSpotHealthStatus
}

export interface WordPressHealthCheck extends HealthCheckBase {
  status: WordPressHealthStatus
}

export interface QueueHealthCheck extends HealthCheckBase {
  status: RuntimeHealthStatus
  driver: string
  failed_jobs: number
}

export interface HealthChecks {
  api: RuntimeHealthCheck
  database: RuntimeHealthCheck
  migrations: RuntimeHealthCheck
  foxy_webhook: IntegrationHealthCheck
  foxy_api: IntegrationHealthCheck
  hubspot: HubSpotHealthCheck
  wordpress: WordPressHealthCheck
  queue: QueueHealthCheck
}

export interface HealthReadyResponse {
  service: string
  status: OverallHealthStatus
  checked_at: string
  checks: HealthChecks
}

export interface ServiceBannerState {
  key: ServiceKey
  label: string
  status: ServiceBannerStatus
  title: string
}
