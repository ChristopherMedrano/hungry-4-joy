import { crmErrorCodeLabel, formatDashboardTimestamp } from '../lib/crmLabels'
import {
  attemptIdMatch,
  attemptIdMatchLabels,
  displayOptional,
} from '../lib/attemptIdMatch'
import { crmRetryUiState } from '../lib/crmRetryEligibility'
import type { CheckoutEventDetail, CrmStatusSummary } from '../types/dashboard'
import { CrmStatusBadge } from './CrmStatusBadge'
import { sectionHeadingClass, StatusCallout } from './StatusCallout'

interface CrmSyncDetailSectionProps {
  crmStatusSummary: CrmStatusSummary
  crmSync: CheckoutEventDetail['crm_sync']
  checkoutDonationAttemptId: string | null
  onRetry?: () => Promise<void>
  isRetrying?: boolean
  retryError?: string | null
  retryDisabled?: boolean
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 border-b border-slate-800 py-3 sm:grid-cols-[9rem_1fr]">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="min-w-0 break-all font-mono text-sm text-slate-200">{value ?? 'N/A'}</dd>
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
            'HubSpot sync failed with a non-retryable error. Retry only after fixing the underlying issue.'
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
            'HubSpot sync failed with a temporary error. You can retry now.'
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
  onRetry,
  isRetrying = false,
  retryError = null,
  retryDisabled = false,
}: CrmSyncDetailSectionProps) {
  const errorLabel = crmErrorCodeLabel(crmSync.error_code)
  const hubspotAttemptId = crmSync.hubspot_donation_attempt_id
  const retryUi = crmRetryUiState(crmStatusSummary, crmSync)

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

      <div className="mt-4 space-y-2">
        {retryUi.kind === 'eligible' && onRetry ? (
          <button
            type="button"
            disabled={isRetrying || retryDisabled}
            onClick={() => void onRetry()}
            className="rounded-md bg-orange-500/20 px-3 py-2 text-sm font-medium text-orange-200 ring-1 ring-orange-500/40 transition hover:bg-orange-500/30 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRetrying ? 'Retrying…' : retryUi.label}
          </button>
        ) : null}
        {retryDisabled && retryUi.kind === 'eligible' ? (
          <p className="text-xs text-slate-500">
            Manual retry is available in API view modes only.
          </p>
        ) : null}
        {retryUi.kind === 'ineligible' &&
        (crmStatusSummary === 'synced' ||
          crmStatusSummary === 'pending' ||
          crmStatusSummary === 'not_applicable') ? (
          <p className="text-xs text-slate-500">{retryUi.reason}</p>
        ) : null}
        {retryError ? (
          <p className="text-sm text-rose-300" role="alert">
            {retryError}
          </p>
        ) : null}
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
