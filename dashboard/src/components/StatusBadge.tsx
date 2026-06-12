import type { StatusSummary } from '../types/dashboard'

const labels: Record<StatusSummary, string> = {
  donation_completed_crm_synced: 'CRM synced',
  donation_completed_crm_synced_with_warning: 'CRM synced (warning)',
  donation_completed_crm_pending: 'CRM pending',
  donation_completed_crm_failed: 'CRM failed',
  donation_completed_crm_retryable: 'CRM retryable',
  donation_completed_crm_not_applicable: 'CRM n/a',
  payment_failed: 'Payment failed',
  checkout_pending: 'Checkout pending',
}

const styles: Record<StatusSummary, string> = {
  donation_completed_crm_synced: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
  donation_completed_crm_synced_with_warning: 'bg-amber-500/15 text-amber-200 ring-amber-500/30',
  donation_completed_crm_pending: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
  donation_completed_crm_failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  donation_completed_crm_retryable: 'bg-orange-500/15 text-orange-300 ring-orange-500/30',
  donation_completed_crm_not_applicable: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
  payment_failed: 'bg-rose-500/15 text-rose-300 ring-rose-500/30',
  checkout_pending: 'bg-slate-500/15 text-slate-300 ring-slate-500/30',
}

interface StatusBadgeProps {
  summary: StatusSummary
}

export function StatusBadge({ summary }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[summary]}`}
    >
      {labels[summary]}
    </span>
  )
}
