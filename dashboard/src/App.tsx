import { useEffect, useState } from 'react'
import { fetchDashboardEventDetail, fetchDashboardEvents } from './api/dashboard'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { EventDetailPanel } from './components/EventDetailPanel'
import { EventFiltersBar } from './components/EventFiltersBar'
import { EventTable } from './components/EventTable'
import { Layout } from './components/Layout'
import { LoadingState } from './components/LoadingState'
import { defaultFilters } from './lib/filterEvents'
import type {
  CheckoutEventDetail,
  CheckoutEventSummary,
  EventFilters,
  ShellViewState,
} from './types/dashboard'

const previewOptions: { value: ShellViewState; label: string }[] = [
  { value: 'ready', label: 'Live API' },
  { value: 'loading', label: 'Loading preview' },
  { value: 'empty', label: 'Empty preview' },
  { value: 'error', label: 'Error preview' },
]

function App() {
  const [viewState, setViewState] = useState<ShellViewState>('ready')
  const [filters, setFilters] = useState<EventFilters>(defaultFilters)
  const [events, setEvents] = useState<CheckoutEventSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CheckoutEventDetail | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    if (viewState !== 'ready') {
      return
    }

    let cancelled = false

    async function loadEvents(): Promise<void> {
      setIsLoadingList(true)
      setListError(null)

      try {
        const response = await fetchDashboardEvents(filters)
        if (cancelled) {
          return
        }

        setEvents(response.data)
        setSelectedId((current) => {
          if (current && response.data.some((event) => event.checkout_event_id === current)) {
            return current
          }

          return response.data[0]?.checkout_event_id ?? null
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setEvents([])
        setSelectedId(null)
        setSelectedDetail(null)
        setListError(error instanceof Error ? error.message : 'Could not load checkout events.')
      } finally {
        if (!cancelled) {
          setIsLoadingList(false)
        }
      }
    }

    void loadEvents()

    return () => {
      cancelled = true
    }
  }, [viewState, filters, reloadToken])

  useEffect(() => {
    if (viewState !== 'ready' || selectedId === null) {
      return
    }

    let cancelled = false

    async function loadDetail(): Promise<void> {
      setIsLoadingDetail(true)
      setDetailError(null)

      try {
        const detail = await fetchDashboardEventDetail(selectedId!)
        if (!cancelled) {
          setSelectedDetail(detail)
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedDetail(null)
          setDetailError(
            error instanceof Error ? error.message : 'Could not load checkout event detail.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDetail(false)
        }
      }
    }

    void loadDetail()

    return () => {
      cancelled = true
    }
  }, [viewState, selectedId])

  const previewControl = (
    <label className="text-sm text-slate-400">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide">
        View mode
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

  if (viewState === 'loading' || (viewState === 'ready' && isLoadingList && events.length === 0)) {
    content = <LoadingState />
  } else if (viewState === 'error' || (viewState === 'ready' && listError)) {
    content = (
      <ErrorState
        message={
          listError ??
          'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
        }
        onRetry={() => {
          setViewState('ready')
          setReloadToken((token) => token + 1)
        }}
      />
    )
  } else if (viewState === 'empty' || events.length === 0) {
    content = <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
  } else {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <EventTable events={events} selectedId={selectedId} onSelect={setSelectedId} />
        {detailError ? (
          <ErrorState
            message={detailError}
            onRetry={() => setSelectedId((id) => id)}
          />
        ) : isLoadingDetail ? (
          <LoadingState />
        ) : (
          <EventDetailPanel event={selectedId === null ? null : selectedDetail} />
        )}
      </div>
    )
  }

  return (
    <Layout previewControl={previewControl}>
      <div className="space-y-4">
        <EventFiltersBar filters={filters} onChange={setFilters} />
        <p className="text-xs text-slate-500">
          Live data from{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">/api/dashboard/events</code>. Use{' '}
          <code className="rounded bg-slate-800 px-1 py-0.5">npm run dev:hosted</code> for Render
          data or <code className="rounded bg-slate-800 px-1 py-0.5">npm run dev</code> with local
          middleware.
        </p>
        {content}
      </div>
    </Layout>
  )
}

export default App
