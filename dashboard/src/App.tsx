import { useEffect, useMemo, useState } from 'react'
import { fetchDashboardEventDetail, fetchDashboardEvents } from './api/dashboard'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { EventDetailPanel } from './components/EventDetailPanel'
import { EventFiltersBar } from './components/EventFiltersBar'
import { EventTable } from './components/EventTable'
import { Layout } from './components/Layout'
import { LoadingState } from './components/LoadingState'
import {
  findSeededDashboardEvent,
  seededDashboardEvents,
} from './data/seededDashboardEvents'
import { defaultFilters, filterEvents } from './lib/filterEvents'
import type {
  CheckoutEventDetail,
  CheckoutEventSummary,
  EventFilters,
  ShellViewState,
} from './types/dashboard'

const previewOptions: { value: ShellViewState; label: string }[] = [
  { value: 'ready', label: 'Live API' },
  { value: 'seeded', label: 'Seeded' },
  { value: 'loading', label: 'Loading preview' },
  { value: 'empty', label: 'Empty preview' },
  { value: 'error', label: 'Error preview' },
]

function App() {
  const [viewState, setViewState] = useState<ShellViewState>('ready')
  const [filters, setFilters] = useState<EventFilters>(defaultFilters)
  const [liveEvents, setLiveEvents] = useState<CheckoutEventSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CheckoutEventDetail | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  const isSeededView = viewState === 'seeded'

  const seededEvents = useMemo(
    () => filterEvents(seededDashboardEvents, filters),
    [filters],
  )

  const displayEvents = isSeededView ? seededEvents : liveEvents

  const activeSelectedId = useMemo(() => {
    if (selectedId && displayEvents.some((event) => event.checkout_event_id === selectedId)) {
      return selectedId
    }

    return displayEvents[0]?.checkout_event_id ?? null
  }, [selectedId, displayEvents])

  const seededDetail =
    activeSelectedId === null ? null : findSeededDashboardEvent(activeSelectedId) ?? null

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

        setLiveEvents(response.data)
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

        setLiveEvents([])
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
    if (viewState !== 'ready' || activeSelectedId === null) {
      return
    }

    let cancelled = false

    async function loadDetail(): Promise<void> {
      setIsLoadingDetail(true)
      setDetailError(null)

      try {
        const detail = await fetchDashboardEventDetail(activeSelectedId!)
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
  }, [viewState, activeSelectedId])

  const previewControl = (
    <label className="text-sm text-slate-400">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide">
        View mode
      </span>
      <select
        value={viewState}
        onChange={(event) => {
          const nextView = event.target.value as ShellViewState
          setViewState(nextView)
          setDetailError(null)
          setListError(null)

          if (nextView === 'seeded') {
            const nextEvents = filterEvents(seededDashboardEvents, filters)
            setSelectedId(nextEvents[0]?.checkout_event_id ?? null)
          }
        }}
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

  if (viewState === 'loading' || (viewState === 'ready' && isLoadingList && liveEvents.length === 0)) {
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
  } else if (viewState === 'empty' || displayEvents.length === 0) {
    content = <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
  } else {
    content = (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(18rem,1fr)]">
        <EventTable
          events={displayEvents}
          selectedId={activeSelectedId}
          onSelect={setSelectedId}
        />
        {detailError && !isSeededView ? (
          <ErrorState
            message={detailError}
            onRetry={() => setSelectedId((id) => id)}
          />
        ) : isLoadingDetail && !isSeededView ? (
          <LoadingState />
        ) : (
          <EventDetailPanel
            event={isSeededView ? seededDetail : activeSelectedId === null ? null : selectedDetail}
          />
        )}
      </div>
    )
  }

  const dataSourceHint = isSeededView ? (
    <>
      Seeded demo rows covering every transaction and CRM badge state. Local API equivalent:{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">php artisan dashboard:seed-status-demo</code>
      .
    </>
  ) : (
    <>
      Live data from{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">/api/dashboard/events</code>. Use{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">npm run dev:hosted</code> for Render data
      or <code className="rounded bg-slate-800 px-1 py-0.5">npm run dev</code> with local
      middleware.
    </>
  )

  return (
    <Layout previewControl={previewControl}>
      <div className="space-y-4">
        <EventFiltersBar filters={filters} onChange={setFilters} />
        <p className="text-xs text-slate-500">{dataSourceHint}</p>
        {content}
      </div>
    </Layout>
  )
}

export default App
