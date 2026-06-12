import type { EventFilters } from '../types/dashboard'

interface EventFiltersBarProps {
  filters: EventFilters
  onChange: (filters: EventFilters) => void
}

const selectClass =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

export function EventFiltersBar({ filters, onChange }: EventFiltersBarProps) {
  const update = (key: keyof EventFilters, value: string) => {
    onChange({ ...filters, [key]: value })
  }

  return (
    <section
      aria-label="Event filters"
      className="grid gap-3 rounded-lg border border-slate-800 bg-slate-900/60 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
    >
      <label className="block xl:col-span-2">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Search
        </span>
        <input
          type="search"
          value={filters.search}
          onChange={(event) => update('search', event.target.value)}
          placeholder="Attempt id, event id, email…"
          className={selectClass}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Campaign
        </span>
        <select
          value={filters.campaign_id}
          onChange={(event) => update('campaign_id', event.target.value)}
          className={selectClass}
        >
          <option value="">All campaigns</option>
          <option value="loaves-campaign-01">Loaves 4 Joy</option>
          <option value="fishes-campaign-01">Fishes 4 Joy</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Event type
        </span>
        <select
          value={filters.event_type}
          onChange={(event) => update('event_type', event.target.value)}
          className={selectClass}
        >
          <option value="">All types</option>
          <option value="donation.created">donation.created</option>
          <option value="payment.failed">payment.failed</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          CRM sync
        </span>
        <select
          value={filters.crm_sync_status}
          onChange={(event) => update('crm_sync_status', event.target.value)}
          className={selectClass}
        >
          <option value="">All CRM states</option>
          <option value="succeeded">succeeded</option>
          <option value="retryable">retryable</option>
          <option value="failed">failed</option>
          <option value="pending">pending</option>
          <option value="not_applicable">not_applicable</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
          Ingest channel
        </span>
        <select
          value={filters.ingest_channel}
          onChange={(event) => update('ingest_channel', event.target.value)}
          className={selectClass}
        >
          <option value="">All channels</option>
          <option value="fixture_receiver">fixture_receiver</option>
          <option value="foxy_webhook">foxy_webhook</option>
        </select>
      </label>
    </section>
  )
}
