import { crmErrorCodeLabel, formatDashboardTimestamp } from '../lib/crmLabels'
import {
  attemptIdMatch,
  attemptIdMatchLabels,
  displayOptional,
} from '../lib/attemptIdMatch'
import type { CheckoutEventDetail, CrmStatusSummary } from '../types/dashboard'
import { CrmStatusBadge } from './CrmStatusBadge'
import { sectionHeadingClass, StatusCallout } from './StatusCallout'

interface CrmSyncDetailSectionProps {
  crmStatusSummary: CrmStatusSummary
  crmSync: CheckoutEventDetail['crm_sync']
  checkoutDonationAttemptId: string | null
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="break-words font-mono text-sm text-slate-200">{value ?? 'N/A'}</dd>
    </div>
  )
}

function MatchRow({
  checkoutAttemptId,
  hubspotAttemptId,
}: {
  checkoutAttemptId: string | null
  hubspotAttemptId: string | null
}) {
  const match = attemptIdMatch(checkoutAttemptId, hubspotAttemptId)
  const toneClass =
    match === 'matched'
      ? 'text-emerald-300'
      : match === 'mismatch'
        ? 'text-amber-300'
        : 'text-slate-200'

  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
        Attempt id match
      </dt>
      <dd className={`text-sm font-medium ${toneClass}`}>{attemptIdMatchLabels[match]}</dd>
    </div>
  )
}

function notApplicableMessage(crmSync: CheckoutEventDetail['crm_sync']): string {
  if (crmSync.eligible) {
    return 'This donation is not eligible for HubSpot CRM sync under current rules.'
  }

  return 'CRM sync does not apply to this event. Failed payments, pending checkouts, and other non-completed donations are excluded.'
}

function CrmStatusCallout({
  crmStatusSummary,
  crmSync,
  errorLabel,
}: {
  crmStatusSummary: CrmStatusSummary
  crmSync: CheckoutEventDetail['crm_sync']
  errorLabel: string | null
}) {
  switch (crmStatusSummary) {
    case 'not_applicable':
      return (
        <StatusCallout
          tone="slate"
          title="CRM sync not applicable"
          body={notApplicableMessage(crmSync)}
        />
      )
    case 'pending':
      return (
        <StatusCallout
          tone="sky"
          title="Sync pending"
          body="This donation is eligible for HubSpot sync, but no sync attempt has completed yet."
        />
      )
    case 'synced':
      return (
        <StatusCallout
          tone="emerald"
          title="Synced to HubSpot"
          body={`Contact and deal records were created or updated in ${crmSync.hubspot_mode} mode.`}
        />
      )
    case 'warning':
      return (
        <StatusCallout
          tone="amber"
          title="Synced with warning"
          body={
            crmSync.error_message ??
            'Contact and deal synced successfully, but newsletter list enrollment failed.'
          }
        />
      )
    case 'failed':
      return (
        <StatusCallout
          tone="rose"
          title="CRM sync failed"
          body={
            crmSync.error_message ??
            errorLabel ??
            'HubSpot sync failed with a non-retryable error.'
          }
        />
      )
    case 'retryable':
      return (
        <StatusCallout
          tone="orange"
          title="Retryable CRM sync failure"
          body={
            crmSync.error_message ??
            errorLabel ??
            'HubSpot sync failed with a retryable error. Manual retry actions will be wired in issue #39.'
          }
        />
      )
    default:
      return null
  }
}

export function CrmSyncDetailSection({
  crmStatusSummary,
  crmSync,
  checkoutDonationAttemptId,
}: CrmSyncDetailSectionProps) {
  const errorLabel = crmErrorCodeLabel(crmSync.error_code)
  const hubspotAttemptId = crmSync.hubspot_donation_attempt_id

  return (
    <section className="mt-6 border-t border-slate-800 pt-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h3 className={sectionHeadingClass}>Hubspot CRM Sync Event</h3>
        <CrmStatusBadge summary={crmStatusSummary} />
      </div>

      <dl>
        <DetailRow
          label="HubSpot attempt id"
          value={displayOptional(hubspotAttemptId)}
        />
        <MatchRow
          checkoutAttemptId={checkoutDonationAttemptId}
          hubspotAttemptId={hubspotAttemptId}
        />
        <DetailRow label="Sync status" value={crmSync.status} />
        <DetailRow label="HubSpot mode" value={crmSync.hubspot_mode} />
        <DetailRow label="Sync row id" value={crmSync.crm_sync_attempt_id?.toString() ?? null} />
        <DetailRow label="Contact id" value={displayOptional(crmSync.hubspot_contact_id)} />
        <DetailRow label="Deal id" value={displayOptional(crmSync.hubspot_deal_id)} />
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
      </dl>

      <div className="mt-4">
        <CrmStatusCallout
          crmStatusSummary={crmStatusSummary}
          crmSync={crmSync}
          errorLabel={errorLabel}
        />
      </div>

      {crmSync.error_code ? (
        <dl className="mt-4">
          <DetailRow label="Error code" value={crmSync.error_code} />
          <DetailRow label="Error label" value={errorLabel} />
        </dl>
      ) : null}
    </section>
  )
}
