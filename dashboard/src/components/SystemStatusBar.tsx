import type { HealthReadyResponse } from '../types/health'
import { deriveServiceBannerStates } from '../lib/serviceHealth'
import { ServiceStatusIndicator } from './ServiceStatusIndicator'

interface SystemStatusBarProps {
  health: HealthReadyResponse | null
  isLoading: boolean
  error: string | null
  isPreview: boolean
  onOpenDetails: () => void
  onRefresh?: () => void
}

export function SystemStatusBar({
  health,
  isLoading,
  error,
  isPreview,
  onOpenDetails,
  onRefresh,
}: SystemStatusBarProps) {
  const services = deriveServiceBannerStates(health, {
    unreachable: Boolean(error && !health),
  })

  return (
    <div className="mx-auto max-w-[1600px] px-3 lg:px-4">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5 sm:gap-2 sm:px-3 sm:py-2">
        <div className="flex flex-wrap items-center gap-0.5 sm:gap-1">
          {services.map((service, index) => (
            <div key={service.key} className="flex items-center">
              <ServiceStatusIndicator
                service={service.key}
                label={service.label}
                status={isLoading && !health ? 'disabled' : service.status}
                title={
                  isLoading && !health
                    ? `Loading ${service.label} status…`
                    : service.title
                }
                onClick={onOpenDetails}
              />
              {index < services.length - 1 ? (
                <span className="mx-0.5 hidden h-6 w-px bg-slate-700 sm:inline" aria-hidden />
              ) : null}
            </div>
          ))}
        </div>

        {isPreview ? (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Preview
          </span>
        ) : null}

        {isLoading ? (
          <span className="text-xs text-slate-500">Updating…</span>
        ) : null}

        {error && !health ? (
          <span className="text-xs text-rose-300">{error}</span>
        ) : null}

        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            className="ml-auto rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Refresh
          </button>
        ) : null}
      </div>
    </div>
  )
}
