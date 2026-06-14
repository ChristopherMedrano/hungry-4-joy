import { formatAttemptId } from '../lib/formatAttemptId'
import type { CheckoutEventSummary } from '../types/dashboard'
import { crmErrorCodeLabel } from '../lib/crmLabels'
import { CrmStatusBadge } from './CrmStatusBadge'
import { TransactionStatusBadge } from './TransactionStatusBadge'
import { formatShortDateTime } from '../lib/formatDate'

interface EventTableProps {
  events: CheckoutEventSummary[]
  selectedId: number | null
  onView: (id: number) => void
  /** Render without the outer card border (when nested inside another card). */
  embedded?: boolean
}

export function EventTable({ events, selectedId, onView, embedded = false }: EventTableProps) {
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
                Transaction
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                CRM
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Donor
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Amount
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                When
              </th>
              <th scope="col" className="px-3 py-3 text-right font-medium">
                <span className="sr-only">View</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {events.map((event) => {
              const selected = event.checkout_event_id === selectedId

              return (
                <tr
                  key={event.checkout_event_id}
                  onClick={() => onView(event.checkout_event_id)}
                  className={`cursor-pointer transition hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none ${
                    selected ? 'bg-teal-500/10 ring-1 ring-inset ring-teal-500/30' : ''
                  }`}
                >
                  <td
                    className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-300"
                    title={event.donation_attempt_id ?? undefined}
                  >
                    {formatAttemptId(event.donation_attempt_id)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <TransactionStatusBadge status={event.transaction_status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <CrmStatusBadge
                      summary={event.crm_status_summary}
                      title={crmErrorCodeLabel(event.crm_sync.error_code) ?? undefined}
                    />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-200">{event.campaign.campaign_name}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-100">{event.donor.display_name}</div>
                    <div className="text-xs text-slate-400">{event.donor.email}</div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-200">
                    ${event.donation.amount.toFixed(2)} {event.donation.currency}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-400">{formatShortDateTime(event.event_created_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        onView(event.checkout_event_id)
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
