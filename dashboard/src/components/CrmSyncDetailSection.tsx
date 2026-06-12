import { crmErrorCodeLabel, formatDashboardTimestamp } from '../lib/crmLabels'
import type { CheckoutEventDetail, CrmStatusSummary } from '../types/dashboard'
import { CrmStatusBadge } from './CrmStatusBadge'

interface CrmSyncDetailSectionProps {
  crmStatusSummary: CrmStatusSummary
  crmSync: CheckoutEventDetail['crm_sync']
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words font-mono text-sm text-slate-200">{value ?? '—'}</dd>
    </div>
  )
}

function StateCallout({
  title,
  body,
  tone,
}: {
  title: string
  body: string
  tone: 'sky' | 'emerald' | 'amber' | 'rose' | 'orange' | 'slate'
}) {
  const styles: Record<typeof tone, string> = {
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
    orange: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
    slate: 'border-slate-600/40 bg-slate-800/40 text-slate-300',
  }

  return (
    <section className={`rounded-md border p-3 text-sm ${styles[tone]}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 opacity-90">{body}</p>
    </section>
  )
}

function notApplicableMessage(crmSync: CheckoutEventDetail['crm_sync']): string {
  if (crmSync.eligible) {
    return 'This donation is not eligible for HubSpot CRM sync under current rules.'
  }

  return 'CRM sync does not apply to this event. Failed payments, pending checkouts, and other non-completed donations are excluded.'
}

export function CrmSyncDetailSection({
  crmStatusSummary,
  crmSync,
}: CrmSyncDetailSectionProps) {
  const errorLabel = crmErrorCodeLabel(crmSync.error_code)

  return (
    <section className="mt-6 border-t border-slate-800 pt-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">
          HubSpot CRM sync
        </h3>
        <CrmStatusBadge summary={crmStatusSummary} />
      </div>

      {crmStatusSummary === 'not_applicable' ? (
        <StateCallout
          tone="slate"
          title="CRM sync not applicable"
          body={notApplicableMessage(crmSync)}
        />
      ) : null}

      {crmStatusSummary === 'pending' ? (
        <StateCallout
          tone="sky"
          title="Sync pending"
          body="This donation is eligible for HubSpot sync, but no sync attempt has completed yet."
        />
      ) : null}

      {crmStatusSummary === 'synced' ? (
        <StateCallout
          tone="emerald"
          title="Synced to HubSpot"
          body={`Contact and deal records were created or updated in ${crmSync.hubspot_mode} mode.`}
        />
      ) : null}

      {crmStatusSummary === 'warning' ? (
        <StateCallout
          tone="amber"
          title="Synced with warning"
          body={
            crmSync.error_message ??
            'Contact and deal synced successfully, but newsletter list enrollment failed.'
          }
        />
      ) : null}

      {crmStatusSummary === 'failed' ? (
        <StateCallout
          tone="rose"
          title="CRM sync failed"
          body={
            crmSync.error_message ??
            errorLabel ??
            'HubSpot sync failed with a non-retryable error.'
          }
        />
      ) : null}

      {crmStatusSummary === 'retryable' ? (
        <StateCallout
          tone="orange"
          title="Retryable CRM sync failure"
          body={
            crmSync.error_message ??
            errorLabel ??
            'HubSpot sync failed with a retryable error. Manual retry actions will be wired in issue #39.'
          }
        />
      ) : null}

      <dl className="mt-4">
        <DetailRow label="Sync status" value={crmSync.status} />
        <DetailRow label="HubSpot mode" value={crmSync.hubspot_mode} />
        <DetailRow label="Attempt id" value={crmSync.crm_sync_attempt_id?.toString() ?? null} />
        <DetailRow label="Contact id" value={crmSync.hubspot_contact_id} />
        <DetailRow label="Deal id" value={crmSync.hubspot_deal_id} />
        <DetailRow
          label="Last attempted"
          value={
            crmSync.last_attempted_at
              ? formatDashboardTimestamp(crmSync.last_attempted_at)
              : null
          }
        />
        <DetailRow
          label="Next retry"
          value={
            crmSync.next_retry_at ? formatDashboardTimestamp(crmSync.next_retry_at) : null
          }
        />
        <DetailRow label="Retry count" value={crmSync.retry_count.toString()} />
        {crmSync.error_code ? (
          <>
            <DetailRow label="Error code" value={crmSync.error_code} />
            <DetailRow label="Error label" value={errorLabel} />
          </>
        ) : null}
      </dl>
    </section>
  )
}
