import { crmErrorCodeLabel, formatDashboardTimestamp } from '../lib/crmLabels'
import { formatAttemptId } from '../lib/formatAttemptId'
import type { CheckoutEventSummary } from '../types/dashboard'
import { CrmStatusBadge } from './CrmStatusBadge'

interface RetryActivityTableProps {
  events: CheckoutEventSummary[]
  onOpenEvent: (checkoutEventId: number) => void
}

export function RetryActivityTable({ events, onOpenEvent }: RetryActivityTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                Attempt id
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                CRM
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Retries
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Last CRM attempt
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium md:table-cell">
                Current error
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Open
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {events.map((event) => {
              const errorLabel = crmErrorCodeLabel(event.crm_sync.error_code)

              return (
                <tr key={event.checkout_event_id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event.checkout_event_id)}
                      className="max-w-[14rem] truncate font-mono text-xs text-teal-300 underline decoration-teal-500/40 underline-offset-2 hover:text-teal-200"
                      title={event.donation_attempt_id ?? undefined}
                    >
                      {formatAttemptId(event.donation_attempt_id)}
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <CrmStatusBadge summary={event.crm_status_summary} title={errorLabel ?? undefined} />
                  </td>
                  <td className="px-3 py-3 font-mono text-slate-200">
                    {event.crm_sync.retry_count}
                  </td>
                  <td className="px-3 py-3 text-slate-400">
                    {formatDashboardTimestamp(event.crm_sync.last_attempted_at)}
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <div className="text-slate-300">{errorLabel ?? '—'}</div>
                    {event.crm_sync.error_code ? (
                      <div className="font-mono text-xs text-slate-500">
                        {event.crm_sync.error_code}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => onOpenEvent(event.checkout_event_id)}
                      className="rounded-md bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 ring-1 ring-slate-700 transition hover:bg-slate-700"
                    >
                      View event
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
