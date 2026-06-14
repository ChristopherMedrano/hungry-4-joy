import type { HealthReadyResponse } from '../types/health'
import {
  healthCheckOrder,
  healthCheckRemediation,
  healthCheckStatusLabel,
  overallHealthLabels,
  overallHealthTone,
} from '../lib/healthLabels'
import { deriveServiceBannerStates } from '../lib/serviceHealth'
import { ServiceStatusIndicator } from './ServiceStatusIndicator'
import { SystemStatusBadge } from './SystemStatusBadge'
import { StatusCallout, sectionHeadingClass } from './StatusCallout'

interface SystemStatusPanelProps {
  health: HealthReadyResponse
  isRefreshing: boolean
  onRefresh: () => void
  isPreview?: boolean
}

function formatCheckedAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}

export function SystemStatusPanel({
  health,
  isRefreshing,
  onRefresh,
  isPreview = false,
}: SystemStatusPanelProps) {
  const overallTone = overallHealthTone[health.status]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">System status</h2>
          <p className="mt-1 text-sm text-slate-400">
            Readiness checks for middleware API, database, migrations, and integration
            configuration.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing || isPreview}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isRefreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {isPreview ? (
        <StatusCallout
          tone="slate"
          title="Seeded preview"
          body="These checks are static demo data. Switch to local or hosted API view mode for live readiness results."
        />
      ) : null}

      <StatusCallout
        tone={overallTone}
        title={`Overall: ${overallHealthLabels[health.status]}`}
        body={`Last checked ${formatCheckedAt(health.checked_at)}. Liveness probe remains at GET /api/health; this panel uses GET /api/health/ready.`}
      />

      <section className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 p-3">
        {deriveServiceBannerStates(health).map((service) => (
          <ServiceStatusIndicator
            key={service.key}
            service={service.key}
            label={service.label}
            status={service.status}
            title={service.title}
          />
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-2">
        {healthCheckOrder.map((key) => {
          const check = health.checks[key]
          const statusLabel = healthCheckStatusLabel(key, check.status)

          return (
            <article
              key={key}
              className="rounded-lg border border-slate-800 bg-slate-900/40 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className={sectionHeadingClass}>{check.label}</h3>
                <SystemStatusBadge checkKey={key} check={check} />
              </div>
              <p className="mt-2 text-sm text-slate-200">{check.summary}</p>
              <p className="mt-2 text-xs text-slate-500">
                Status: <span className="text-slate-400">{statusLabel}</span>
              </p>
              {key === 'queue' && 'driver' in check ? (
                <p className="mt-1 text-xs text-slate-500">
                  Driver: <span className="text-slate-400">{check.driver}</span>
                  {' · '}
                  Failed jobs:{' '}
                  <span className="text-slate-400">{check.failed_jobs}</span>
                </p>
              ) : null}
              <p className="mt-3 text-xs text-slate-500">{healthCheckRemediation[key]}</p>
            </article>
          )
        })}
      </section>
    </div>
  )
}
