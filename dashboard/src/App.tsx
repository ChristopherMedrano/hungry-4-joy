import { useMemo, useState } from 'react'
import { mockEvents } from './data/mockEvents'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { EventDetailPanel } from './components/EventDetailPanel'
import { EventFiltersBar } from './components/EventFiltersBar'
import { EventTable } from './components/EventTable'
import { Layout } from './components/Layout'
import { LoadingState } from './components/LoadingState'
import { defaultFilters, filterEvents } from './lib/filterEvents'
import type { ShellViewState } from './types/dashboard'

const previewOptions: { value: ShellViewState; label: string }[] = [
  { value: 'ready', label: 'Data' },
  { value: 'loading', label: 'Loading' },
  { value: 'empty', label: 'Empty' },
  { value: 'error', label: 'Error' },
]

function App() {
  const [viewState, setViewState] = useState<ShellViewState>('ready')
  const [filters, setFilters] = useState(defaultFilters)
  const [selectedId, setSelectedId] = useState<number | null>(mockEvents[0]?.checkout_event_id ?? null)

  const filteredEvents = useMemo(
    () => filterEvents(mockEvents, filters),
    [filters],
  )

  const selectedEvent =
    filteredEvents.find((event) => event.checkout_event_id === selectedId) ??
    filteredEvents[0] ??
    null

  const previewControl = (
    <label className="text-sm text-slate-400">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide">
        Shell preview
      </span>
      <select
        value={viewState}
        onChange={(event) => setViewState(event.target.value as ShellViewState)}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      >
        {previewOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )

  let content

  if (viewState === 'loading') {
    content = <LoadingState />
  } else if (viewState === 'error') {
    content = (
      <ErrorState
        message="The dashboard API is not connected yet. This shell preview shows the error state."
        onRetry={() => setViewState('ready')}
      />
    )
  } else if (viewState === 'empty' || filteredEvents.length === 0) {
    content = <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
  } else {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <EventTable
          events={filteredEvents}
          selectedId={selectedEvent?.checkout_event_id ?? null}
          onSelect={setSelectedId}
        />
        <EventDetailPanel event={selectedEvent} />
      </div>
    )
  }

  return (
    <Layout previewControl={previewControl}>
      <div className="space-y-4">
        <EventFiltersBar filters={filters} onChange={setFilters} />
        <p className="text-xs text-slate-500">
          Mock data only — shaped for{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">docs/contracts.md</code>{' '}
          §5 until Laravel <code className="rounded bg-slate-800 px-1 py-0.5">/api/dashboard</code>{' '}
          routes exist.
        </p>
        {content}
      </div>
    </Layout>
  )
}

export default App
