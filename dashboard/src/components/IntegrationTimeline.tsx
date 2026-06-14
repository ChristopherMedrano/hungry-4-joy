import type { IntegrationStepSummary } from '../types/integration'
import {
  formatIntegrationTimestamp,
  integrationStepLabel,
  integrationStepStatusClass,
} from '../lib/integrationLabels'
import { sectionHeadingClass } from './StatusCallout'

interface IntegrationTimelineProps {
  steps: IntegrationStepSummary[]
}

export function IntegrationTimeline({ steps }: IntegrationTimelineProps) {
  if (steps.length === 0) {
    return (
      <section className="mt-6 border-t border-slate-800 pt-5">
        <h3 className={sectionHeadingClass}>Integration timeline</h3>
        <p className="mt-3 text-sm text-slate-400">
          No integration steps recorded for this attempt yet.
        </p>
      </section>
    )
  }

  return (
    <section className="mt-6 border-t border-slate-800 pt-5">
      <h3 className={sectionHeadingClass}>Integration timeline</h3>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li
            key={step.integration_step_log_id}
            className="rounded-md border border-slate-800 bg-slate-950/40 px-4 py-3"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">
                {integrationStepLabel(step.step)}
              </p>
              <time className="text-xs text-slate-500">
                {formatIntegrationTimestamp(step.recorded_at)}
              </time>
            </div>
            <p className="mt-1 text-sm text-slate-400">{step.summary}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className={integrationStepStatusClass(step.status)}>{step.status}</span>
              <span>{step.producer}</span>
              {step.error_code ? <span className="font-mono text-slate-400">{step.error_code}</span> : null}
              {step.occurrence_count > 1 ? (
                <span>×{step.occurrence_count}</span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
