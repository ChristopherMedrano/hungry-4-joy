import type { TransactionStatus } from '../types/dashboard'

const labels: Record<TransactionStatus, string> = {
  completed: 'Completed',
  pending: 'Pending',
  failed: 'Failed',
}

const styles: Record<TransactionStatus, string> = {
  completed: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  pending: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
}

interface TransactionStatusBadgeProps {
  status: TransactionStatus
}

export function TransactionStatusBadge({ status }: TransactionStatusBadgeProps) {
  const style = styles[status] ?? styles.pending
  const label = labels[status] ?? status

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}
    >
      {label}
    </span>
  )
}
