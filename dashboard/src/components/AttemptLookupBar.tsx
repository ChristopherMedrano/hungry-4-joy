import { isAttemptIdQuery, isCartIdQuery } from '../lib/handoffReconcileEligibility'

export type AttemptLookupMode = 'attempt' | 'cart'

interface AttemptLookupBarProps {
  query: string
  mode: AttemptLookupMode
  onQueryChange: (value: string) => void
  onModeChange: (mode: AttemptLookupMode) => void
  onLookup: () => void
  isLoading?: boolean
  disabled?: boolean
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

export function AttemptLookupBar({
  query,
  mode,
  onQueryChange,
  onModeChange,
  onLookup,
  isLoading = false,
  disabled = false,
}: AttemptLookupBarProps) {
  const trimmed = query.trim()
  const canLookup =
    !disabled &&
    trimmed !== '' &&
    (mode === 'attempt' ? isAttemptIdQuery(trimmed) : isCartIdQuery(trimmed))

  return (
    <section
      aria-label="Attempt trace lookup"
      className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-slate-200">Trace by attempt or Foxy cart</h2>
        <div className="flex rounded-md border border-slate-700 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => onModeChange('attempt')}
            className={`rounded px-2 py-1 ${
              mode === 'attempt'
                ? 'bg-teal-500/20 text-teal-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Attempt id
          </button>
          <button
            type="button"
            onClick={() => onModeChange('cart')}
            className={`rounded px-2 py-1 ${
              mode === 'cart'
                ? 'bg-teal-500/20 text-teal-200'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Foxy cart id
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-slate-500">
        {mode === 'attempt'
          ? 'Load handoff and checkout event for one donation_attempt_id. Use when the paginated list has no row yet.'
          : 'Resolve attempt id from a Foxy error-log cart id when reconcile cannot find a transaction.'}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && canLookup) {
              onLookup()
            }
          }}
          placeholder={
            mode === 'attempt' ? 'h4j_attempt_…' : 'Foxy error log cart id (digits only)'
          }
          className={inputClass}
          disabled={disabled}
        />
        <button
          type="button"
          disabled={!canLookup || isLoading}
          onClick={onLookup}
          className="shrink-0 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? 'Looking up…' : 'Look up'}
        </button>
      </div>
    </section>
  )
}
