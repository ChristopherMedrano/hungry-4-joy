import type { CheckoutAttemptsFilters } from '../types/handoff'
import type {
  HandoffBatchReconcileSummary,
  HandoffSweepUnfedSummary,
} from '../api/dashboard'
import { fieldClass } from '../lib/formStyles'

interface CheckoutAttemptsFiltersBarProps {
  filters: CheckoutAttemptsFilters
  onChange: (filters: CheckoutAttemptsFilters) => void
  onReconcileOpen?: () => Promise<void>
  onSweepUnfed?: () => Promise<void>
  isReconcilingOpen?: boolean
  isSweepingUnfed?: boolean
  batchActionsDisabled?: boolean
  batchSummary?: HandoffBatchReconcileSummary | HandoffSweepUnfedSummary | null
  batchSummaryKind?: 'reconcile-open' | 'sweep-unfed' | null
  batchError?: string | null
}

const inputClass = `${fieldClass} sm:max-w-xs`

const actionButtonClass =
  'rounded-md border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-teal-500 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-50'

function formatReconcileOpenSummary(summary: HandoffBatchReconcileSummary): string {
  return `Processed ${summary.processed} handoff(s): ${summary.linked} linked, ${summary.still_open} still open, ${summary.abandoned} abandoned.`
}

function formatSweepUnfedSummary(summary: HandoffSweepUnfedSummary): string {
  const errorSuffix =
    summary.errors.length > 0 ? ` Errors: ${summary.errors.join(', ')}.` : ''

  return `Scanned ${summary.scanned} unfed transaction(s): ${summary.ingested} ingested, ${summary.linked} linked, ${summary.skipped_existing} already stored, ${summary.skipped_no_attempt_id} without attempt id.${errorSuffix}`
}

export function CheckoutAttemptsFiltersBar({
  filters,
  onChange,
  onReconcileOpen,
  onSweepUnfed,
  isReconcilingOpen = false,
  isSweepingUnfed = false,
  batchActionsDisabled = false,
  batchSummary = null,
  batchSummaryKind = null,
  batchError = null,
}: CheckoutAttemptsFiltersBarProps) {
  const showReconcileSummary = Boolean(batchSummary && batchSummaryKind === 'reconcile-open')
  const showSweepSummary = Boolean(batchSummary && batchSummaryKind === 'sweep-unfed')
  const hasMessages =
    batchActionsDisabled || showReconcileSummary || showSweepSummary || Boolean(batchError)

  return (
    <div aria-label="Unlinked attempts toolbar" className="border-b border-slate-800 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Filter by attempt id, campaign, or status…"
          aria-label="Filter unlinked attempts"
          className={inputClass}
        />

        {onReconcileOpen || onSweepUnfed ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="hidden text-xs uppercase tracking-wide text-slate-500 lg:inline">
              Bulk
            </span>
            {onReconcileOpen ? (
              <button
                type="button"
                className={actionButtonClass}
                disabled={batchActionsDisabled || isReconcilingOpen || isSweepingUnfed}
                onClick={() => void onReconcileOpen()}
              >
                {isReconcilingOpen ? 'Reconciling…' : 'Reconcile open handoffs'}
              </button>
            ) : null}
            {onSweepUnfed ? (
              <button
                type="button"
                className={actionButtonClass}
                disabled={batchActionsDisabled || isReconcilingOpen || isSweepingUnfed}
                onClick={() => void onSweepUnfed()}
              >
                {isSweepingUnfed ? 'Sweeping…' : 'Sweep unfed transactions'}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {hasMessages ? (
        <div className="mt-2 space-y-1">
          {batchActionsDisabled ? (
            <p className="text-xs text-slate-500">
              Bulk reconcile actions are available in API view modes only.
            </p>
          ) : null}
          {showReconcileSummary ? (
            <p className="text-xs text-teal-200" role="status">
              {formatReconcileOpenSummary(batchSummary as HandoffBatchReconcileSummary)}
            </p>
          ) : null}
          {showSweepSummary ? (
            <p className="text-xs text-teal-200" role="status">
              {formatSweepUnfedSummary(batchSummary as HandoffSweepUnfedSummary)}
            </p>
          ) : null}
          {batchError ? (
            <p className="text-xs text-rose-300" role="alert">
              {batchError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
