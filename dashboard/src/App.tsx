import { useEffect, useMemo, useState } from 'react'
import {
  fetchCrmSyncRetry,
  fetchDashboardAnalyticsEventDetail,
  fetchDashboardAnalyticsEvents,
  fetchDashboardEventDetail,
  fetchDashboardEvents,
  setDashboardApiBase,
} from './api/dashboard'
import { AnalyticsEventDetailPanel } from './components/AnalyticsEventDetailPanel'
import { AnalyticsEventTable } from './components/AnalyticsEventTable'
import { AnalyticsFiltersBar } from './components/AnalyticsFiltersBar'
import { EmptyState } from './components/EmptyState'
import { ErrorState } from './components/ErrorState'
import { EventDetailPanel } from './components/EventDetailPanel'
import { EventFiltersBar } from './components/EventFiltersBar'
import { EventTable } from './components/EventTable'
import { Layout } from './components/Layout'
import { LoadingState } from './components/LoadingState'
import { RetryActivityTable } from './components/RetryActivityTable'
import {
  findSeededDashboardEvent,
  seededDashboardEvents,
} from './data/seededDashboardEvents'
import {
  apiBaseForMode,
  HOSTED_MIDDLEWARE_URL,
  isApiDataMode,
  isLocalDashboardHost,
  viewModeOptions,
} from './lib/dashboardDataMode'
import type { DashboardSection } from './lib/dashboardSections'
import { defaultFilters, filterEvents } from './lib/filterEvents'
import { hasRetryActivity, sortByLastCrmAttempt } from './lib/retryActivity'
import { defaultAnalyticsFilters } from './types/analytics'
import type {
  AnalyticsFilters,
  ServerAnalyticsEventDetail,
  ServerAnalyticsEventSummary,
} from './types/analytics'
import type {
  CheckoutEventDetail,
  CheckoutEventSummary,
  DashboardDataMode,
  EventFilters,
} from './types/dashboard'

function App() {
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('events')
  const [viewState, setViewState] = useState<DashboardDataMode>('hosted-api')
  const [filters, setFilters] = useState<EventFilters>(defaultFilters)
  const [liveEvents, setLiveEvents] = useState<CheckoutEventSummary[]>([])
  const [retryActivityEvents, setRetryActivityEvents] = useState<CheckoutEventSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CheckoutEventDetail | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [retryActivityError, setRetryActivityError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingRetryActivity, setIsLoadingRetryActivity] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [isCrmRetrying, setIsCrmRetrying] = useState(false)
  const [crmRetryError, setCrmRetryError] = useState<string | null>(null)
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>(defaultAnalyticsFilters)
  const [liveAnalyticsEvents, setLiveAnalyticsEvents] = useState<ServerAnalyticsEventSummary[]>([])
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<number | null>(null)
  const [selectedAnalyticsDetail, setSelectedAnalyticsDetail] =
    useState<ServerAnalyticsEventDetail | null>(null)
  const [analyticsListError, setAnalyticsListError] = useState<string | null>(null)
  const [analyticsDetailError, setAnalyticsDetailError] = useState<string | null>(null)
  const [isLoadingAnalyticsList, setIsLoadingAnalyticsList] = useState(false)
  const [isLoadingAnalyticsDetail, setIsLoadingAnalyticsDetail] = useState(false)

  const isSeededView = viewState === 'seeded'
  const isApiView = isApiDataMode(viewState)

  const seededEvents = useMemo(
    () => filterEvents(seededDashboardEvents, filters),
    [filters],
  )

  const seededRetryActivityEvents = useMemo(
    () => sortByLastCrmAttempt(seededEvents.filter(hasRetryActivity)),
    [seededEvents],
  )

  const displayEvents = isSeededView ? seededEvents : liveEvents
  const displayRetryActivityEvents = isSeededView
    ? seededRetryActivityEvents
    : retryActivityEvents

  const activeSelectedId = useMemo(() => {
    if (selectedId && displayEvents.some((event) => event.checkout_event_id === selectedId)) {
      return selectedId
    }

    return displayEvents[0]?.checkout_event_id ?? null
  }, [selectedId, displayEvents])

  const seededDetail =
    activeSelectedId === null ? null : findSeededDashboardEvent(activeSelectedId) ?? null

  const activeSelectedAnalyticsId = useMemo(() => {
    if (
      selectedAnalyticsId &&
      liveAnalyticsEvents.some(
        (event) => event.server_analytics_event_id === selectedAnalyticsId,
      )
    ) {
      return selectedAnalyticsId
    }

    return liveAnalyticsEvents[0]?.server_analytics_event_id ?? null
  }, [selectedAnalyticsId, liveAnalyticsEvents])

  useEffect(() => {
    if (!isApiView || dashboardSection !== 'analytics-events') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadAnalyticsEvents(): Promise<void> {
      setIsLoadingAnalyticsList(true)
      setAnalyticsListError(null)

      try {
        const response = await fetchDashboardAnalyticsEvents(analyticsFilters)
        if (cancelled) {
          return
        }

        setLiveAnalyticsEvents(response.data)
        setSelectedAnalyticsId((current) => {
          if (
            current &&
            response.data.some((event) => event.server_analytics_event_id === current)
          ) {
            return current
          }

          return response.data[0]?.server_analytics_event_id ?? null
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setLiveAnalyticsEvents([])
        setSelectedAnalyticsId(null)
        setSelectedAnalyticsDetail(null)
        setAnalyticsListError(
          error instanceof Error ? error.message : 'Could not load server analytics events.',
        )
      } finally {
        if (!cancelled) {
          setIsLoadingAnalyticsList(false)
        }
      }
    }

    void loadAnalyticsEvents()

    return () => {
      cancelled = true
    }
  }, [viewState, analyticsFilters, reloadToken, isApiView, dashboardSection])

  useEffect(() => {
    if (
      !isApiView ||
      dashboardSection !== 'analytics-events' ||
      activeSelectedAnalyticsId === null
    ) {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadAnalyticsDetail(): Promise<void> {
      setIsLoadingAnalyticsDetail(true)
      setAnalyticsDetailError(null)

      try {
        const detail = await fetchDashboardAnalyticsEventDetail(activeSelectedAnalyticsId!)
        if (!cancelled) {
          setSelectedAnalyticsDetail(detail)
        }
      } catch (error) {
        if (!cancelled) {
          setSelectedAnalyticsDetail(null)
          setAnalyticsDetailError(
            error instanceof Error
              ? error.message
              : 'Could not load server analytics detail.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAnalyticsDetail(false)
        }
      }
    }

    void loadAnalyticsDetail()

    return () => {
      cancelled = true
    }
  }, [viewState, activeSelectedAnalyticsId, isApiView, dashboardSection])

  useEffect(() => {
    if (!isApiView || dashboardSection !== 'events') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

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
  }, [viewState, filters, reloadToken, isApiView, dashboardSection])

  useEffect(() => {
    if (!isApiView || dashboardSection !== 'retry-activity') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadRetryActivity(): Promise<void> {
      setIsLoadingRetryActivity(true)
      setRetryActivityError(null)

      try {
        const response = await fetchDashboardEvents(filters, 1, { retryActivity: true })
        if (cancelled) {
          return
        }

        setRetryActivityEvents(sortByLastCrmAttempt(response.data))
      } catch (error) {
        if (cancelled) {
          return
        }

        setRetryActivityEvents([])
        setRetryActivityError(
          error instanceof Error ? error.message : 'Could not load retry activity.',
        )
      } finally {
        if (!cancelled) {
          setIsLoadingRetryActivity(false)
        }
      }
    }

    void loadRetryActivity()

    return () => {
      cancelled = true
    }
  }, [viewState, filters, reloadToken, isApiView, dashboardSection])

  useEffect(() => {
    if (!isApiView || dashboardSection !== 'events' || activeSelectedId === null) {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadDetail(): Promise<void> {
      setIsLoadingDetail(true)
      setDetailError(null)
      setCrmRetryError(null)

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
  }, [viewState, activeSelectedId, isApiView, dashboardSection])

  function updateEventInLists(updated: CheckoutEventDetail): void {
    const summary = {
      ...updated,
    }

    setSelectedDetail(updated)
    setLiveEvents((events) =>
      events.map((event) =>
        event.checkout_event_id === updated.checkout_event_id ? summary : event,
      ),
    )
    setRetryActivityEvents((events) => {
      const next = events.map((event) =>
        event.checkout_event_id === updated.checkout_event_id ? summary : event,
      )

      return hasRetryActivity(summary)
        ? sortByLastCrmAttempt(next)
        : sortByLastCrmAttempt(next.filter((event) => event.checkout_event_id !== updated.checkout_event_id))
    })
  }

  async function handleCrmRetry(): Promise<void> {
    const attemptId = selectedDetail?.crm_sync.crm_sync_attempt_id
    if (attemptId === null || attemptId === undefined) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setIsCrmRetrying(true)
    setCrmRetryError(null)

    try {
      const updated = await fetchCrmSyncRetry(attemptId)
      updateEventInLists(updated)
    } catch (error) {
      setCrmRetryError(error instanceof Error ? error.message : 'CRM sync retry failed.')
    } finally {
      setIsCrmRetrying(false)
    }
  }

  function openEventFromRetryActivity(checkoutEventId: number): void {
    setSelectedId(checkoutEventId)
    setDashboardSection('events')
  }

  const previewControl = (
    <label className="text-sm text-slate-400">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide">
        View mode
      </span>
      <select
        value={viewState}
        onChange={(event) => {
          const nextView = event.target.value as DashboardDataMode
          setViewState(nextView)
          setDetailError(null)
          setListError(null)
          setRetryActivityError(null)

          if (nextView === 'seeded') {
            const nextEvents = filterEvents(seededDashboardEvents, filters)
            setSelectedId(nextEvents[0]?.checkout_event_id ?? null)
          }
        }}
        className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
      >
        {viewModeOptions().map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )

  const dataSourceHint = isSeededView ? (
    <>
      Offline preview rows with every transaction and CRM badge state. No network calls.
    </>
  ) : viewState === 'local-api' ? (
    <>
      Local middleware at{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">127.0.0.1:8000</code>. Demo fixture rows
      appear after{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">php artisan dashboard:seed-status-demo</code>
      . Filter ingest channel to{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">foxy_webhook</code> for webhook-shaped
      rows.
    </>
  ) : isLocalDashboardHost() ? (
    <>
      Hosted middleware at{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">{HOSTED_MIDDLEWARE_URL}</code>. Production-like
      checkout rows usually have ingest channel{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">foxy_webhook</code>.
    </>
  ) : (
    <>
      Live data from proxied{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">/api/dashboard/events</code> on this
      dashboard host.
    </>
  )

  const retryActivityHint = (
    <>
      Retry activity lists donations whose CRM sync row shows retries, failures, retryable state, or
      a newsletter list warning such as{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">hubspot_list_warning</code>. Rows link to
      the checkout event by <strong className="font-medium text-slate-400">donation attempt id</strong>.
      Each row reflects the stored CRM sync attempt fields (`retry_count`, status, and error summary).
      After a successful list retry clears a warning, earlier list-enrollment errors are no longer
      shown on that attempt row.
    </>
  )

  const analyticsHint = (
    <>
      Server conversion records emitted by Laravel after validated checkout ingest and CRM sync.
      Replay fixtures with{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">npm run connect:foxy-demo</code> or post
      to{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">/api/checkout/events</code> to populate
      rows. Full contract payloads are available in the detail panel and Laravel logs as{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">[H4J analytics demo]</code>.
    </>
  )

  let content

  if (dashboardSection === 'analytics-events') {
    if (isSeededView) {
      content = (
        <EmptyState
          title="Server analytics needs live API data"
          message="Switch view mode to hosted or local API, then replay checkout fixtures to populate server analytics rows."
          onResetFilters={() => setViewState('hosted-api')}
        />
      )
    } else if (
      viewState === 'loading' ||
      (isApiView && isLoadingAnalyticsList && liveAnalyticsEvents.length === 0)
    ) {
      content = <LoadingState />
    } else if (viewState === 'error' || (isApiView && analyticsListError)) {
      content = (
        <ErrorState
          message={
            analyticsListError ??
            'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
          }
          onRetry={() => {
            setViewState('hosted-api')
            setReloadToken((token) => token + 1)
          }}
        />
      )
    } else if (viewState === 'empty' || liveAnalyticsEvents.length === 0) {
      content = (
        <EmptyState onResetFilters={() => setAnalyticsFilters(defaultAnalyticsFilters)} />
      )
    } else {
      content = (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <AnalyticsEventTable
            events={liveAnalyticsEvents}
            selectedId={activeSelectedAnalyticsId}
            onSelect={setSelectedAnalyticsId}
          />
          {analyticsDetailError ? (
            <ErrorState
              message={analyticsDetailError}
              onRetry={() => setSelectedAnalyticsId((id) => id)}
            />
          ) : isLoadingAnalyticsDetail ? (
            <LoadingState />
          ) : (
            <AnalyticsEventDetailPanel event={selectedAnalyticsDetail} />
          )}
        </div>
      )
    }
  } else if (dashboardSection === 'retry-activity') {
    if (viewState === 'loading' || (isApiView && isLoadingRetryActivity && displayRetryActivityEvents.length === 0)) {
      content = <LoadingState />
    } else if (viewState === 'error' || (isApiView && retryActivityError)) {
      content = (
        <ErrorState
          message={
            retryActivityError ??
            'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
          }
          onRetry={() => {
            setViewState('hosted-api')
            setReloadToken((token) => token + 1)
          }}
        />
      )
    } else if (viewState === 'empty' || displayRetryActivityEvents.length === 0) {
      content = (
        <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
      )
    } else {
      content = (
        <RetryActivityTable
          events={displayRetryActivityEvents}
          onOpenEvent={openEventFromRetryActivity}
        />
      )
    }
  } else if (dashboardSection === 'events') {
    if (
      viewState === 'loading' ||
      (isApiView && isLoadingList && liveEvents.length === 0)
    ) {
      content = <LoadingState />
    } else if (viewState === 'error' || (isApiView && listError)) {
      content = (
        <ErrorState
          message={
            listError ??
            'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
          }
          onRetry={() => {
            setViewState('hosted-api')
            setReloadToken((token) => token + 1)
          }}
        />
      )
    } else if (viewState === 'empty' || displayEvents.length === 0) {
      content = <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
    } else {
      content = (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
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
              onCrmRetry={isSeededView ? undefined : handleCrmRetry}
              isCrmRetrying={isCrmRetrying}
              crmRetryError={crmRetryError}
              crmRetryDisabled={isSeededView}
            />
          )}
        </div>
      )
    }
  }

  return (
    <Layout
      previewControl={previewControl}
      activeSection={dashboardSection}
      onSectionChange={setDashboardSection}
    >
      <div className="space-y-4">
        {dashboardSection === 'analytics-events' ? (
          <AnalyticsFiltersBar filters={analyticsFilters} onChange={setAnalyticsFilters} />
        ) : (
          <EventFiltersBar filters={filters} onChange={setFilters} />
        )}
        <p className="text-xs text-slate-500">
          {dashboardSection === 'retry-activity'
            ? retryActivityHint
            : dashboardSection === 'analytics-events'
              ? analyticsHint
              : dataSourceHint}
        </p>
        {content}
      </div>
    </Layout>
  )
}

export default App
