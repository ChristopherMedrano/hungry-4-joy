import { formatAttemptId } from '../lib/formatAttemptId'
import type { ServerAnalyticsEventSummary } from '../types/analytics'
import { formatShortDateTime } from '../lib/formatDate'

interface AnalyticsEventTableProps {
  events: ServerAnalyticsEventSummary[]
  selectedId: number | null
  onView: (id: number) => void
  /** Render without the outer card border (when nested inside another card). */
  embedded?: boolean
}

export function AnalyticsEventTable({
  events,
  selectedId,
  onView,
  embedded = false,
}: AnalyticsEventTableProps) {
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
              <th scope="col" className="px-3 py-3 font-medium">
                Event
              </th>
              <th scope="col" className="whitespace-nowrap px-3 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="hidden whitespace-nowrap px-3 py-3 font-medium xl:table-cell">
                Checkout event
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
              const selected = event.server_analytics_event_id === selectedId

              return (
                <tr
                  key={event.server_analytics_event_id}
                  onClick={() => onView(event.server_analytics_event_id)}
                  className={`cursor-pointer transition hover:bg-slate-800/60 focus:bg-slate-800/70 focus:outline-none ${
                    selected ? 'bg-teal-500/10 ring-1 ring-inset ring-teal-500/30' : ''
                  }`}
                >
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400">
                    {formatAttemptId(event.donation_attempt_id)}
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-100">{event.event}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-300">{event.campaign_name ?? '—'}</td>
                  <td className="hidden whitespace-nowrap px-3 py-3 font-mono text-xs text-slate-400 xl:table-cell">
                    {event.stored_checkout_event_id ?? '—'}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-slate-400">{formatShortDateTime(event.event_created_at)}</td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation()
                        onView(event.server_analytics_event_id)
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
