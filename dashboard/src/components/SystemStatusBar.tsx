import type { HealthReadyResponse } from '../types/health'
import { deriveServiceBannerStates } from '../lib/serviceHealth'
import { ServiceLogo } from './ServiceLogo'
import type { ServiceBannerStatus } from '../types/health'

interface SystemStatusBarProps {
  health: HealthReadyResponse | null
  isLoading: boolean
  error: string | null
  isPreview: boolean
  onOpenDetails: () => void
  onRefresh?: () => void
}

const dotStyles: Record<ServiceBannerStatus, string> = {
  healthy: 'bg-emerald-500',
  error: 'bg-rose-500',
  disabled: 'bg-slate-500',
}

export function SystemStatusBar({
  health,
  isLoading,
  error,
  isPreview,
  onOpenDetails,
}: SystemStatusBarProps) {
  const services = deriveServiceBannerStates(health, {
    unreachable: Boolean(error && !health),
  })

  return (
    <button
      type="button"
      onClick={onOpenDetails}
      title="Open system status"
      className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition hover:bg-slate-800/80"
    >
      {services.map((service) => {
        const status: ServiceBannerStatus = isLoading && !health ? 'disabled' : service.status

        return (
          <span key={service.key} className="relative inline-flex" title={service.title}>
            <ServiceLogo service={service.key} className="h-6 w-6" />
            <span
              className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${dotStyles[status]}`}
            />
          </span>
        )
      })}
      {isPreview ? (
        <span className="ml-1 rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-400">
          Preview
        </span>
      ) : null}
    </button>
  )
}
