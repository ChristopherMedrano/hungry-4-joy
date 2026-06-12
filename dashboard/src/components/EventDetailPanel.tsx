import type { CheckoutEventDetail } from '../types/dashboard'
import { CrmSyncDetailSection } from './CrmSyncDetailSection'
import { CrmStatusBadge } from './CrmStatusBadge'
import { FoxyStatusBadge } from './FoxyStatusBadge'

interface EventDetailPanelProps {
  event: CheckoutEventDetail | null
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all font-mono text-sm text-slate-200">{value ?? '—'}</dd>
    </div>
  )
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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-base font-semibold text-white">Event detail</h2>
        <FoxyStatusBadge summary={event.foxy_status_summary} />
        <CrmStatusBadge summary={event.crm_status_summary} />
      </div>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          Checkout event
        </h3>
        <dl className="mt-3">
          <DetailRow label="Event id" value={event.event_id} />
          <DetailRow label="Attempt id" value={event.donation_attempt_id} />
          <DetailRow label="Transaction" value={event.transaction_id} />
          <DetailRow label="Ingest channel" value={event.ingest.channel} />
          <DetailRow label="Event type" value={event.event_type} />
          <DetailRow label="Transaction status" value={event.transaction_status} />
        </dl>
      </section>

      <CrmSyncDetailSection
        crmStatusSummary={event.crm_status_summary}
        crmSync={event.crm_sync}
      />

      {event.failure.failure_message ? (
        <section className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          <p className="font-medium">Payment failure</p>
          <p className="mt-1 break-words text-rose-200/90">{event.failure.failure_message}</p>
          {event.failure.failure_code ? (
            <p className="mt-2 font-mono text-xs text-rose-200/70">
              Code: {event.failure.failure_code}
            </p>
          ) : null}
        </section>
      ) : null}
    </aside>
  )
}
