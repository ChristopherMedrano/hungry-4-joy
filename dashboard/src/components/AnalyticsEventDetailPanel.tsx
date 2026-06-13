import type { ServerAnalyticsEventDetail } from '../types/analytics'
import { displayOptional } from '../lib/attemptIdMatch'
import { condenseAnalyticsPayload } from '../lib/condenseAnalyticsPayload'
import { sectionHeadingClass } from './StatusCallout'

interface AnalyticsEventDetailPanelProps {
  event: ServerAnalyticsEventDetail | null
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-all font-mono text-sm text-slate-200">{displayOptional(value)}</dd>
    </div>
  )
}

export function AnalyticsEventDetailPanel({ event }: AnalyticsEventDetailPanelProps) {
  if (!event) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-400">
        Select a server analytics record to inspect the contract payload emitted by Laravel.
      </aside>
    )
  }

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <section>
        <h3 className={sectionHeadingClass}>Server analytics event</h3>
        <dl className="mt-4">
          <DetailRow label="Event" value={event.event} />
          <DetailRow label="Analytics id" value={event.analytics_event_id} />
          <DetailRow label="Attempt id" value={event.donation_attempt_id} />
          <DetailRow label="Checkout event" value={event.stored_checkout_event_id} />
          <DetailRow label="Producer" value={event.producer} />
          <DetailRow label="Recorded" value={event.recorded_at} />
        </dl>
      </section>

      <section className="mt-6">
        <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Analytics payload (condensed)
        </h4>
        <p className="mb-2 text-xs text-slate-500">
          Emission-only fields. Campaign and checkout attribution appear in the summary above and
          the full contract payload below.
        </p>
        <pre className="max-h-48 overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-teal-100">
          {JSON.stringify(condenseAnalyticsPayload(event.payload), null, 2)}
        </pre>
      </section>

      <section className="mt-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Contract payload (full)
        </h4>
        <pre className="max-h-[28rem] overflow-auto rounded-md border border-slate-800 bg-slate-950 p-3 text-xs leading-relaxed text-teal-100">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      </section>
    </aside>
  )
}
