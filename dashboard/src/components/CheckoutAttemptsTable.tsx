import type { CheckoutAttemptSummary } from '../types/handoff'
import { formatAttemptId } from '../lib/formatAttemptId'
import {
  formatDashboardTimestamp,
  handoffStatusLabels,
  reconciliationNoteShortLabel,
  reconciliationNoteMeaningClass,
} from '../lib/handoffLabels'

interface CheckoutAttemptsTableProps {
  attempts: CheckoutAttemptSummary[]
  selectedAttemptId: string | null
  onView: (donationAttemptId: string) => void
  /** Render without the outer card border (when nested inside another card). */
  embedded?: boolean
}

function formatWhen(iso: string | null): string {
  if (!iso) {
    return '—'
  }

  return formatDashboardTimestamp(iso)
}

function statusBadgeClass(status: CheckoutAttemptSummary['handoff']['status']): string {
  switch (status) {
    case 'abandoned':
      return 'bg-slate-500/15 text-slate-300 ring-slate-500/30'
    case 'checkout_event_reconciled':
      return 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30'
    default:
      return 'bg-amber-500/15 text-amber-300 ring-amber-500/30'
  }
}

export function CheckoutAttemptsTable({
  attempts,
  selectedAttemptId,
  onView,
  embedded = false,
}: CheckoutAttemptsTableProps) {
  return (
    <div
      className={
        embedded
          ? 'overflow-hidden'
          : 'overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40'
      }
    >
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Attempt id
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Reconcile note
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Amount
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Tries
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Created
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {attempts.map((attempt) => {
              const selected = attempt.donation_attempt_id === selectedAttemptId
              const note = attempt.handoff.reconciliation.note

              return (
                <tr
                  key={attempt.donation_attempt_id}
                  onClick={() => onView(attempt.donation_attempt_id)}
                  className={`cursor-pointer transition hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none ${
                    selected ? 'bg-teal-500/10 ring-1 ring-inset ring-teal-500/30' : ''
                  }`}
                >
                  <td
                    className="px-3 py-3 font-mono text-xs text-slate-300"
                    title={attempt.donation_attempt_id}
                  >
                    {formatAttemptId(attempt.donation_attempt_id)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${statusBadgeClass(attempt.handoff.status)}`}
                    >
                      {handoffStatusLabels[attempt.handoff.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <div className="max-w-[15rem]">
                      <div className="font-mono text-xs text-slate-300">{note ?? '—'}</div>
                      {note ? (
                        <div className={`mt-1 ${reconciliationNoteMeaningClass}`}>
                          {reconciliationNoteShortLabel(note)}
                        </div>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-200">
                    {attempt.handoff.campaign.campaign_name}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-200">
                    ${attempt.handoff.donation.amount.toFixed(2)} {attempt.handoff.donation.currency}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-300">
                    {attempt.handoff.reconciliation.reconcile_attempts}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-400">
                    {formatWhen(attempt.handoff.handoff_at)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        onView(attempt.donation_attempt_id)
                      }}
                      className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
                    >
                      View
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
