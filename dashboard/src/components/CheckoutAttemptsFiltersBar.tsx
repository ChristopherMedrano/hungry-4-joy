import type { CheckoutAttemptsFilters } from '../types/handoff'
import type {
  HandoffBatchReconcileSummary,
  HandoffSweepUnfedSummary,
} from '../api/dashboard'

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
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

const actionButtonClass =
  'rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 transition hover:border-teal-500 hover:text-teal-100 disabled:cursor-not-allowed disabled:opacity-50'

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
}: CheckoutAttemptsFiltersBarProps) {
  return (
    <section
      aria-label="Checkout attempt filters"
      className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
    >
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Search unlinked attempts
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Attempt id, campaign, reconcile note…"
          className={inputClass}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {onReconcileOpen ? (
          <button
            type="button"
            className={actionButtonClass}
            disabled={batchActionsDisabled || isReconcilingOpen || isSweepingUnfed}
            onClick={() => void onReconcileOpen()}
          >
            {isReconcilingOpen ? 'Reconciling open handoffs…' : 'Reconcile open handoffs'}
          </button>
        ) : null}
        {onSweepUnfed ? (
          <button
            type="button"
            className={actionButtonClass}
            disabled={batchActionsDisabled || isReconcilingOpen || isSweepingUnfed}
            onClick={() => void onSweepUnfed()}
          >
            {isSweepingUnfed ? 'Sweeping unfed transactions…' : 'Sweep unfed transactions'}
          </button>
        ) : null}
      </div>

      {batchActionsDisabled ? (
        <p className="text-xs text-slate-500">
          Batch reconcile actions are available in API view modes only.
        </p>
      ) : null}

      {batchSummary && batchSummaryKind === 'reconcile-open' ? (
        <p className="text-xs text-teal-200" role="status">
          {formatReconcileOpenSummary(batchSummary as HandoffBatchReconcileSummary)}
        </p>
      ) : null}

      {batchSummary && batchSummaryKind === 'sweep-unfed' ? (
        <p className="text-xs text-teal-200" role="status">
          {formatSweepUnfedSummary(batchSummary as HandoffSweepUnfedSummary)}
        </p>
      ) : null}
    </section>
  )
}
