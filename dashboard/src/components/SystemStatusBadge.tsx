import type { HealthChecks, HealthCheckKey } from '../types/health'
import { healthCheckBadgeTone, healthCheckStatusLabel } from '../lib/healthLabels'

const badgeStyles = {
  emerald: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  amber: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  rose: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  slate: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
} as const

interface SystemStatusBadgeProps {
  checkKey: HealthCheckKey
  check: HealthChecks[HealthCheckKey]
  compact?: boolean
}

export function SystemStatusBadge({ checkKey, check, compact = false }: SystemStatusBadgeProps) {
  const tone = healthCheckBadgeTone(checkKey, check.status)
  const statusLabel = healthCheckStatusLabel(checkKey, check.status)

  return (
    <span
      title={`${check.label}: ${check.summary}`}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeStyles[tone]}`}
    >
      {compact ? statusLabel : `${check.label}: ${statusLabel}`}
    </span>
  )
}
