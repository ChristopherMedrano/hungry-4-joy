import type { FoxyStatusSummary } from '../types/dashboard'

const labels: Record<FoxyStatusSummary, string> = {
  webhook: 'Webhook',
  fixture: 'Fixture',
  pending: 'Pending',
  failed: 'Failed',
}

const styles: Record<FoxyStatusSummary, string> = {
  webhook: 'bg-teal-500/15 text-teal-300 ring-teal-500/30',
  fixture: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  pending: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

interface FoxyStatusBadgeProps {
  summary: FoxyStatusSummary
}

export function FoxyStatusBadge({ summary }: FoxyStatusBadgeProps) {
  const style = styles[summary] ?? styles.fixture
  const label = labels[summary] ?? 'Unknown'

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  )
}
