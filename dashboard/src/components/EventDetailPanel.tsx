import type { CheckoutEventDetail, TransactionStatus } from '../types/dashboard'
import { displayOptional } from '../lib/attemptIdMatch'
import { CrmSyncDetailSection } from './CrmSyncDetailSection'
import { sectionHeadingClass, StatusCallout } from './StatusCallout'
import { TransactionStatusBadge } from './TransactionStatusBadge'

interface EventDetailPanelProps {
  event: CheckoutEventDetail | null
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all font-mono text-sm text-slate-200">{displayOptional(value)}</dd>
    </div>
  )
}

function checkoutCallout(event: CheckoutEventDetail) {
  switch (event.transaction_status as TransactionStatus) {
    case 'completed':
      return (
        <StatusCallout
          tone="emerald"
          title="Checkout completed"
          body="The one-time donation completed successfully through Foxy."
        />
      )
    case 'pending':
      return (
        <StatusCallout
          tone="sky"
          title="Checkout pending"
          body="The checkout has not produced a final result yet."
        />
      )
    case 'failed':
      return (
        <StatusCallout
          tone="rose"
          title="Checkout failed"
          body={
            event.failure.failure_message ??
            'The checkout or payment attempt did not complete successfully.'
          }
          code={event.failure.failure_code}
        />
      )
    default:
      return null
  }
}

export function EventDetailPanel({ event }: EventDetailPanelProps) {
  if (!event) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-400">
        Select a checkout event to inspect ingest details, CRM sync state, and retry
        eligibility.
      </aside>
    )
  }

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <h3 className={sectionHeadingClass}>Foxy Checkout Event</h3>
          <TransactionStatusBadge status={event.transaction_status} />
        </div>
        <dl>
          <DetailRow label="Event id" value={event.event_id} />
          <DetailRow label="Attempt id" value={event.donation_attempt_id} />
          <DetailRow label="Transaction" value={event.transaction_id} />
          <DetailRow label="Ingest channel" value={event.ingest.channel} />
          <DetailRow label="Event type" value={event.event_type} />
        </dl>

        <div className="mt-4">{checkoutCallout(event)}</div>
      </section>

      <CrmSyncDetailSection
        crmStatusSummary={event.crm_status_summary}
        crmSync={event.crm_sync}
        checkoutDonationAttemptId={event.donation_attempt_id}
      />
    </aside>
  )
}
