import type { CheckoutAttemptsFilters } from '../types/handoff'

interface CheckoutAttemptsFiltersBarProps {
  filters: CheckoutAttemptsFilters
  onChange: (filters: CheckoutAttemptsFilters) => void
}

const inputClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

export function CheckoutAttemptsFiltersBar({
  filters,
  onChange,
}: CheckoutAttemptsFiltersBarProps) {
  return (
    <section
      aria-label="Checkout attempt filters"
      className="rounded-lg border border-slate-800 bg-slate-900/60 p-4"
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
    </section>
  )
}
