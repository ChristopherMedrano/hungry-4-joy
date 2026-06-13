import type { ServerAnalyticsEventSummary } from '../types/analytics'
import { formatAttemptId } from '../lib/formatAttemptId'
import { sectionHeadingClass } from './StatusCallout'

interface ServerAnalyticsSummarySectionProps {
  events: ServerAnalyticsEventSummary[]
}

export function ServerAnalyticsSummarySection({
  events,
}: ServerAnalyticsSummarySectionProps) {
  if (events.length === 0) {
    return (
      <section className="mt-6 border-t border-slate-800 pt-6">
        <h3 className={sectionHeadingClass}>Server analytics</h3>
        <p className="mt-2 text-sm text-slate-400">
          No server conversion records are stored for this checkout event yet.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6 border-t border-slate-800 pt-6">
      <h3 className={sectionHeadingClass}>Server analytics</h3>
      <ul className="mt-3 space-y-2">
        {events.map((event) => (
          <li
            key={event.server_analytics_event_id}
            className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm"
          >
            <div className="font-medium text-slate-100">{event.event}</div>
            <div className="mt-1 font-mono text-xs text-slate-400">
              {event.analytics_event_id}
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Attempt {formatAttemptId(event.donation_attempt_id)}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
