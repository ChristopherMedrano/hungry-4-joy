import { formatAttemptId } from '../lib/formatAttemptId'
import type { ServerAnalyticsEventSummary } from '../types/analytics'

interface AnalyticsEventTableProps {
  events: ServerAnalyticsEventSummary[]
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

export function AnalyticsEventTable({
  events,
  selectedId,
  onSelect,
}: AnalyticsEventTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-800 text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-3 font-medium">
                Event
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                Campaign
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                Attempt id
              </th>
              <th scope="col" className="hidden px-3 py-3 font-medium xl:table-cell">
                Checkout event
              </th>
              <th scope="col" className="px-3 py-3 font-medium">
                When
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {events.map((event) => {
              const selected = event.server_analytics_event_id === selectedId

              return (
                <tr
                  key={event.server_analytics_event_id}
                  tabIndex={0}
                  onClick={() => onSelect(event.server_analytics_event_id)}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault()
                      onSelect(event.server_analytics_event_id)
                    }
                  }}
                  className={`cursor-pointer transition hover:bg-slate-800/60 ${
                    selected ? 'bg-teal-500/10 ring-1 ring-inset ring-teal-500/30' : ''
                  }`}
                >
                  <td className="px-3 py-3 font-medium text-slate-100">{event.event}</td>
                  <td className="px-3 py-3 text-slate-300">{event.campaign_name ?? '—'}</td>
                  <td className="hidden px-3 py-3 font-mono text-xs text-slate-400 lg:table-cell">
                    {formatAttemptId(event.donation_attempt_id)}
                  </td>
                  <td className="hidden px-3 py-3 font-mono text-xs text-slate-400 xl:table-cell">
                    {event.stored_checkout_event_id ?? '—'}
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
