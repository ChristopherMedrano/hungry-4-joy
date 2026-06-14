import type { AttemptTraceData } from '../types/handoff'
import type { CheckoutEventDetail } from '../types/dashboard'
import { EventDetailPanel } from './EventDetailPanel'
import { HandoffDetailSection } from './HandoffDetailSection'
import { IntegrationTimeline } from './IntegrationTimeline'
import { sectionHeadingClass } from './StatusCallout'

interface AttemptTracePanelProps {
  trace: AttemptTraceData | null
  onReconcile?: () => Promise<void>
  isReconciling?: boolean
  reconcileError?: string | null
  reconcileDisabled?: boolean
  onOpenCrmSyncIssues?: () => void
}

function FoxyCartSummary({ trace }: { trace: AttemptTraceData }) {
  const cart = trace.foxy_cart

  if (!cart) {
    return null
  }

  return (
    <section className="mt-6 border-t border-slate-800 pt-5">
      <h3 className={sectionHeadingClass}>Foxy cart summary</h3>
      <dl className="mt-3">
        <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Cart id</dt>
          <dd className="font-mono text-sm text-slate-200">{trace.foxy_cart_id ?? 'N/A'}</dd>
        </div>
        <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">Total</dt>
          <dd className="font-mono text-sm text-slate-200">
            {cart.total_order !== null ? String(cart.total_order) : 'N/A'}
          </dd>
        </div>
        <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Attempt ids on cart
          </dt>
          <dd className="break-all font-mono text-sm text-slate-200">
            {(trace.donation_attempt_ids ?? cart.donation_attempt_ids).join(', ') || 'N/A'}
          </dd>
        </div>
      </dl>
    </section>
  )
}

export function AttemptTracePanel({
  trace,
  onReconcile,
  isReconciling = false,
  reconcileError = null,
  reconcileDisabled = false,
  onOpenCrmSyncIssues,
}: AttemptTracePanelProps) {
  if (!trace) {
    return (
      <aside className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 p-6 text-sm text-slate-400">
        Look up a donation attempt id or Foxy cart id to inspect handoff reconciliation state when
        no checkout event appears in the list.
      </aside>
    )
  }

  const eventDetail: CheckoutEventDetail | null = trace.checkout_event

  return (
    <aside className="rounded-lg border border-slate-800 bg-slate-900/60 p-5">
      <section>
        <h3 className={sectionHeadingClass}>Attempt trace</h3>
        <p className="mt-2 break-all font-mono text-sm text-slate-300">{trace.donation_attempt_id}</p>
      </section>

      <HandoffDetailSection
        handoff={trace.handoff}
        donationAttemptId={trace.donation_attempt_id}
        onReconcile={onReconcile}
        isReconciling={isReconciling}
        reconcileError={reconcileError}
        reconcileDisabled={reconcileDisabled}
      />

      {eventDetail ? (
        <div
          className={
            trace.handoff ? 'mt-6 border-t border-slate-800 pt-2' : 'mt-6 border-t border-slate-800 pt-5'
          }
        >
          <EventDetailPanel
            event={eventDetail}
            embedded
            omitHandoff
            onOpenCrmSyncIssues={onOpenCrmSyncIssues}
          />
        </div>
      ) : (
        <section className="mt-6 border-t border-slate-800 pt-5">
          <h3 className={sectionHeadingClass}>Foxy checkout event</h3>
          <p className="mt-3 text-sm text-slate-400">
            No normalized checkout event is linked yet. For gateway declines, this is expected when
            Foxy only created a cart and error log entry.
          </p>
        </section>
      )}

      <FoxyCartSummary trace={trace} />

      <IntegrationTimeline steps={trace.integration_steps ?? []} />
    </aside>
  )
}
