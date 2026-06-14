import type { ServiceBannerStatus } from '../types/health'
import { ServiceLogo } from './ServiceLogo'
import type { ServiceKey } from '../types/health'

interface ServiceStatusIndicatorProps {
  service: ServiceKey
  label: string
  status: ServiceBannerStatus
  title: string
  onClick?: () => void
}

const badgeStyles: Record<ServiceBannerStatus, string> = {
  healthy: 'bg-emerald-500 text-white',
  error: 'bg-rose-500 text-white',
  disabled: 'bg-slate-500 text-slate-200',
}

function StatusGlyph({ status }: { status: ServiceBannerStatus }) {
  if (status === 'healthy') {
    return (
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
        <path
          fill="currentColor"
          d="M4.5 8.6 2.2 6.3l-.9.9 3.2 3.2 6.4-6.4-.9-.9-5.5 5.5z"
        />
      </svg>
    )
  }

  if (status === 'error') {
    return (
      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" aria-hidden>
        <path
          fill="currentColor"
          d="M3.1 3.1a.75.75 0 0 1 1.06 0L6 4.94 7.84 3.1a.75.75 0 1 1 1.06 1.06L7.06 6l1.84 1.84a.75.75 0 1 1-1.06 1.06L6 7.06 4.16 8.9a.75.75 0 1 1-1.06-1.06L4.94 6 3.1 4.16a.75.75 0 0 1 0-1.06z"
        />
      </svg>
    )
  }

  return (
    <span className="text-[10px] font-semibold leading-none" aria-hidden>
      −
    </span>
  )
}

export function ServiceStatusIndicator({
  service,
  label,
  status,
  title,
  onClick,
}: ServiceStatusIndicatorProps) {
  const Wrapper = onClick ? 'button' : 'div'

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      title={title}
      aria-label={`${label}: ${status}`}
      className={`group relative flex shrink-0 items-center gap-2 rounded-md px-2 py-1.5 ${
        onClick ? 'hover:bg-slate-800/80' : ''
      }`}
    >
      <span className="relative inline-flex">
        <ServiceLogo service={service} className="h-8 w-8" />
        <span
          className={`absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full ring-2 ring-slate-900 ${badgeStyles[status]}`}
        >
          <StatusGlyph status={status} />
        </span>
      </span>
      <span className="hidden text-xs font-medium text-slate-300 sm:inline">{label}</span>
    </Wrapper>
  )
}
