import {
  formatDashboardTimestamp,
  handoffStatusLabels,
  handoffStatusTone,
  reconciliationNoteLabel,
  reconciliationNoteMeaningClass,
} from '../lib/handoffLabels'
import { handoffReconcileUiState } from '../lib/handoffReconcileEligibility'
import type { HandoffSummary } from '../types/handoff'
import { sectionHeadingClass, StatusCallout } from './StatusCallout'

interface HandoffDetailSectionProps {
  handoff: HandoffSummary | null
  donationAttemptId?: string | null
  onReconcile?: () => Promise<void>
  isReconciling?: boolean
  reconcileError?: string | null
  reconcileDisabled?: boolean
  compact?: boolean
  lead?: boolean
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-sm text-slate-200">{value ?? 'N/A'}</dd>
    </div>
  )
}

function HandoffStatusCallout({ handoff }: { handoff: HandoffSummary }) {
  const note = handoff.reconciliation.note
  const noteLabel = reconciliationNoteLabel(note)
  const tone = handoffStatusTone(handoff.status, note)

  if (handoff.status === 'checkout_event_reconciled') {
    return (
      <StatusCallout
        tone="emerald"
        title="Handoff reconciled"
        body="This click-time handoff is linked to a normalized checkout event."
      />
    )
  }

  if (handoff.status === 'abandoned') {
    return (
      <StatusCallout
        tone="slate"
        title="Handoff abandoned"
        body={
          noteLabel ??
          'No Foxy transaction was found within the configured reconciliation window.'
        }
        code={note ?? undefined}
      />
    )
  }

  if (note === 'foxy_transaction_not_found') {
    return (
      <StatusCallout
        tone="amber"
        title="No Foxy transaction yet"
        body={
          noteLabel ??
          'This is expected for some gateway declines. Use Foxy cart id lookup when the error log shows a cart only.'
        }
        code={note}
      />
    )
  }

  return (
    <StatusCallout
      tone={tone}
      title={handoffStatusLabels[handoff.status]}
      body={
        noteLabel ??
        'The handoff is waiting for a Foxy transaction or webhook to link a checkout event.'
      }
      code={note ?? undefined}
    />
  )
}

export function HandoffDetailSection({
  handoff,
  onReconcile,
  isReconciling = false,
  reconcileError = null,
  reconcileDisabled = false,
  compact = false,
  lead = false,
}: HandoffDetailSectionProps) {
  const reconcileUi = handoffReconcileUiState(handoff)

  if (!handoff) {
    return null
  }

  const sectionClass = lead
    ? ''
    : compact
      ? 'mt-4 border-t border-slate-800 pt-4'
      : 'mt-6 border-t border-slate-800 pt-5'

  return (
    <section className={sectionClass}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className={sectionHeadingClass}>Checkout Handoff</h3>
        <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700">
          {handoffStatusLabels[handoff.status]}
        </span>
      </div>

      <dl>
        <DetailRow label="Handoff status" value={handoff.status} />
        <DetailRow
          label="Handoff at"
          value={handoff.handoff_at ? formatDashboardTimestamp(handoff.handoff_at) : null}
        />
        <DetailRow label="Provider" value={handoff.checkout_provider} />
        <DetailRow label="Source page" value={handoff.source_page} />
        <DetailRow
          label="Reconcile attempts"
          value={String(handoff.reconciliation.reconcile_attempts)}
        />
        <DetailRow
          label="Next reconcile"
          value={
            handoff.reconciliation.next_reconcile_at
              ? formatDashboardTimestamp(handoff.reconciliation.next_reconcile_at)
              : null
          }
        />
        <DetailRow
          label="Foxy transaction"
          value={handoff.reconciliation.foxy_transaction_id}
        />
        <DetailRow
          label="Linked event id"
          value={
            handoff.reconciliation.checkout_event_id !== null
              ? String(handoff.reconciliation.checkout_event_id)
              : null
          }
        />
        {handoff.reconciliation.note ? (
          <>
            <DetailRow label="Reconcile note" value={handoff.reconciliation.note} />
            <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Note meaning
              </dt>
              <dd className={`min-w-0 break-words ${reconciliationNoteMeaningClass}`}>
                {reconciliationNoteLabel(handoff.reconciliation.note)}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <div className="mt-4">
        <HandoffStatusCallout handoff={handoff} />
      </div>

      <div className="mt-4 space-y-2">
        {reconcileUi.kind === 'eligible' && onReconcile ? (
          <button
            type="button"
            disabled={isReconciling || reconcileDisabled}
            onClick={() => void onReconcile()}
            className="rounded-md bg-teal-500/20 px-3 py-2 text-sm font-medium text-teal-200 ring-1 ring-teal-500/40 transition hover:bg-teal-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isReconciling ? 'Reconciling…' : reconcileUi.label}
          </button>
        ) : null}
        {reconcileDisabled && reconcileUi.kind === 'eligible' ? (
          <p className="text-xs text-slate-500">
            Manual reconcile is available in API view modes only.
          </p>
        ) : null}
        {reconcileUi.kind === 'ineligible' && handoff.status === 'cart_handoff_created' ? (
          <p className="text-xs text-slate-500">{reconcileUi.reason}</p>
        ) : null}
        {reconcileError ? (
          <p className="text-sm text-rose-300" role="alert">
            {reconcileError}
          </p>
        ) : null}
      </div>
    </section>
  )
}
