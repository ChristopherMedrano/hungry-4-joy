import type { CrmStatusSummary } from '../types/dashboard'

const labels: Record<CrmStatusSummary, string> = {
  synced: 'Synced',
  warning: 'Warning',
  pending: 'Pending',
  failed: 'Failed',
  retryable: 'Retryable',
  not_applicable: 'N/A',
}

const styles: Record<CrmStatusSummary, string> = {
  synced: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  pending: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  retryable: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  not_applicable: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
}

interface CrmStatusBadgeProps {
  summary: CrmStatusSummary
  title?: string
}

export function CrmStatusBadge({ summary, title }: CrmStatusBadgeProps) {
  const style = styles[summary] ?? styles.not_applicable
  const label = labels[summary] ?? 'Unknown'

  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  )
}
