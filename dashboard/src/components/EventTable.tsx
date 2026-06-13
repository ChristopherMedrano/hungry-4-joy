import { formatAttemptId } from '../lib/formatAttemptId'
import type { CheckoutEventSummary } from '../types/dashboard'
import { crmErrorCodeLabel } from '../lib/crmLabels'
import { CrmStatusBadge } from './CrmStatusBadge'
import { TransactionStatusBadge } from './TransactionStatusBadge'

interface EventTableProps {
  events: CheckoutEventSummary[]
  selectedId: number | null
  onSelect: (id: number) => void
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function EventTable({ events, selectedId, onSelect }: EventTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                Transaction
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                CRM
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Donor
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Amount
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                Attempt id
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                When
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {events.map((event) => {
              const selected = event.checkout_event_id === selectedId

              return (
                <tr
                  key={event.checkout_event_id}
                  tabIndex={0}
                  onClick={() => onSelect(event.checkout_event_id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault()
                      onSelect(event.checkout_event_id)
                    }
                  }}
                  aria-selected={selected}
                  className={`cursor-pointer transition hover:bg-slate-800/70 focus:bg-slate-800/70 focus:outline-none ${
                    selected ? 'bg-teal-500/10 ring-1 ring-inset ring-teal-500/30' : ''
                  }`}
                >
                  <td className="px-3 py-3">
                    <TransactionStatusBadge status={event.transaction_status} />
                  </td>
                  <td className="px-3 py-3">
                    <CrmStatusBadge
                      summary={event.crm_status_summary}
                      title={
                        crmErrorCodeLabel(event.crm_sync.error_code) ??
                        undefined
                      }
                    />
                  </td>
                  <td className="px-3 py-3 text-slate-200">{event.campaign.campaign_name}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-100">{event.donor.display_name}</div>
                    <div className="text-xs text-slate-400">{event.donor.email}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-200">
                    ${event.donation.amount.toFixed(2)} {event.donation.currency}
                  </td>
                  <td
                    className="hidden px-3 py-3 font-mono text-xs text-slate-400 lg:table-cell"
                    title={event.donation_attempt_id ?? undefined}
                  >
                    {formatAttemptId(event.donation_attempt_id)}
                  </td>
                  <td className="px-3 py-3 text-slate-400">{formatWhen(event.event_created_at)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
