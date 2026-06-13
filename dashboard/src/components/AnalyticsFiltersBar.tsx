import type { AnalyticsFilters } from '../types/analytics'

interface AnalyticsFiltersBarProps {
  filters: AnalyticsFilters
  onChange: (filters: AnalyticsFilters) => void
}

const eventOptions = [
  { value: '', label: 'All events' },
  { value: 'DonationCompleted', label: 'DonationCompleted' },
  { value: 'PaymentFailed', label: 'PaymentFailed' },
  { value: 'HubSpotSyncSucceeded', label: 'HubSpotSyncSucceeded' },
  { value: 'HubSpotSyncFailed', label: 'HubSpotSyncFailed' },
]

export function AnalyticsFiltersBar({ filters, onChange }: AnalyticsFiltersBarProps) {
  return (
    <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/40 p-4 sm:grid-cols-2">
      <label className="text-sm text-slate-300">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Event
        </span>
        <select
          value={filters.event}
          onChange={(event) => onChange({ ...filters, event: event.target.value })}
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        >
          {eventOptions.map((option) => (
            <option key={option.value || 'all'} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm text-slate-300">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
          Search
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Attempt id, checkout event id, analytics id"
          className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm"
        />
      </label>
    </div>
  )
}
