import type { CheckoutEventDetail } from '../types/dashboard'
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

      <dl>
        <DetailRow label="Event id" value={event.event_id} />
        <DetailRow label="Attempt id" value={event.donation_attempt_id} />
        <DetailRow label="Transaction" value={event.transaction_id} />
        <DetailRow label="Ingest channel" value={event.ingest.channel} />
        <DetailRow label="CRM status" value={event.crm_sync.status} />
        <DetailRow label="HubSpot mode" value={event.crm_sync.hubspot_mode} />
        <DetailRow label="Contact id" value={event.crm_sync.hubspot_contact_id} />
        <DetailRow label="Deal id" value={event.crm_sync.hubspot_deal_id} />
        <DetailRow
          label="Retry count"
          value={event.crm_sync.retry_count.toString()}
        />
        <DetailRow label="Next retry" value={event.crm_sync.next_retry_at} />
        <DetailRow label="Error code" value={event.crm_sync.error_code} />
        <DetailRow label="Error message" value={event.crm_sync.error_message} />
      </dl>

      {event.failure.failure_message ? (
        <section className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-100">
          <p className="font-medium">Payment failure</p>
          <p className="mt-1 text-rose-200/90">{event.failure.failure_message}</p>
        </section>
      ) : null}

      {event.crm_sync.status === 'retryable' ? (
        <section className="mt-4 rounded-md border border-orange-500/30 bg-orange-500/10 p-3 text-sm text-orange-100">
          <p className="font-medium">Retry eligible</p>
          <p className="mt-1 text-orange-200/90">
            Manual retry actions will be wired in a later milestone. This panel is ready
            for safe retry controls from the Laravel API.
          </p>
        </section>
      ) : null}
    </aside>
  )
}
