import { useEffect, useMemo, useState } from 'react'
import {
  fetchCrmSyncRetry,
  fetchDashboardAnalyticsEventDetail,
  fetchDashboardAnalyticsEvents,
  fetchDashboardCheckoutAttempts,
  fetchDashboardEventByAttempt,
  fetchDashboardEventByCart,
  fetchDashboardEventDetail,
  fetchDashboardEvents,
  fetchHandoffReconcile,
  fetchHealthReady,
  setDashboardApiBase,
} from './api/dashboard'
import { AttemptLookupBar, type AttemptLookupMode } from './components/AttemptLookupBar'
import { AttemptTracePanel } from './components/AttemptTracePanel'
import { CheckoutAttemptsFiltersBar } from './components/CheckoutAttemptsFiltersBar'
import { CheckoutAttemptsTable } from './components/CheckoutAttemptsTable'
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
import { CrmSyncIssuesTable } from './components/CrmSyncIssuesTable'
import { SystemStatusBar } from './components/SystemStatusBar'
import { SystemStatusPanel } from './components/SystemStatusPanel'
import {
  findSeededDashboardEvent,
  seededDashboardEvents,
} from './data/seededDashboardEvents'
import { seededCheckoutAttempts } from './data/seededCheckoutAttempts'
import { findSeededIntegrationSteps } from './data/seededIntegrationSteps'
import { seededHealthStatus } from './data/seededHealthStatus'
import {
  apiBaseForMode,
  HOSTED_MIDDLEWARE_URL,
  isApiDataMode,
  isLocalDashboardHost,
  viewModeOptions,
} from './lib/dashboardDataMode'
import { defaultCheckoutAttemptsFilters } from './lib/checkoutAttemptsFilters'
import { filterCheckoutAttempts } from './lib/filterCheckoutAttempts'
import type { DashboardSection } from './lib/dashboardSections'
import { defaultFilters, filterEvents } from './lib/filterEvents'
import { filterCrmSyncIssuesBySearch, hasCrmSyncIssue, sortByLastCrmAttempt } from './lib/crmSyncIssues'
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
import type { AttemptTraceData, CheckoutAttemptSummary, CheckoutAttemptsFilters } from './types/handoff'
import type { HealthReadyResponse } from './types/health'

function App() {
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('events')
  const [viewState, setViewState] = useState<DashboardDataMode>('hosted-api')
  const [filters, setFilters] = useState<EventFilters>(defaultFilters)
  const [liveEvents, setLiveEvents] = useState<CheckoutEventSummary[]>([])
  const [crmSyncIssuesEvents, setCrmSyncIssuesEvents] = useState<CheckoutEventSummary[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedDetail, setSelectedDetail] = useState<CheckoutEventDetail | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const [crmSyncIssuesError, setCrmSyncIssuesError] = useState<string | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isLoadingList, setIsLoadingList] = useState(false)
  const [isLoadingCrmSyncIssues, setIsLoadingCrmSyncIssues] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [crmRetryingEventId, setCrmRetryingEventId] = useState<number | null>(null)
  const [crmRetryError, setCrmRetryError] = useState<string | null>(null)
  const [crmSyncIssuesFocusAttemptId, setCrmSyncIssuesFocusAttemptId] = useState<string | null>(
    null,
  )
  const [attemptLookupQuery, setAttemptLookupQuery] = useState('')
  const [attemptLookupMode, setAttemptLookupMode] = useState<AttemptLookupMode>('attempt')
  const [attemptTrace, setAttemptTrace] = useState<AttemptTraceData | null>(null)
  const [attemptTraceError, setAttemptTraceError] = useState<string | null>(null)
  const [isLoadingAttemptTrace, setIsLoadingAttemptTrace] = useState(false)
  const [isHandoffReconciling, setIsHandoffReconciling] = useState(false)
  const [handoffReconcileError, setHandoffReconcileError] = useState<string | null>(null)
  const [checkoutAttemptsFilters, setCheckoutAttemptsFilters] =
    useState<CheckoutAttemptsFilters>(defaultCheckoutAttemptsFilters)
  const [liveCheckoutAttempts, setLiveCheckoutAttempts] = useState<CheckoutAttemptSummary[]>([])
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const [checkoutAttemptsError, setCheckoutAttemptsError] = useState<string | null>(null)
  const [isLoadingCheckoutAttempts, setIsLoadingCheckoutAttempts] = useState(false)
  const [analyticsFilters, setAnalyticsFilters] = useState<AnalyticsFilters>(defaultAnalyticsFilters)
  const [liveAnalyticsEvents, setLiveAnalyticsEvents] = useState<ServerAnalyticsEventSummary[]>([])
  const [selectedAnalyticsId, setSelectedAnalyticsId] = useState<number | null>(null)
  const [selectedAnalyticsDetail, setSelectedAnalyticsDetail] =
    useState<ServerAnalyticsEventDetail | null>(null)
  const [analyticsListError, setAnalyticsListError] = useState<string | null>(null)
  const [analyticsDetailError, setAnalyticsDetailError] = useState<string | null>(null)
  const [isLoadingAnalyticsList, setIsLoadingAnalyticsList] = useState(false)
  const [isLoadingAnalyticsDetail, setIsLoadingAnalyticsDetail] = useState(false)
  const [healthReady, setHealthReady] = useState<HealthReadyResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [isLoadingHealth, setIsLoadingHealth] = useState(false)
  const [healthReloadToken, setHealthReloadToken] = useState(0)

  const isSeededView = viewState === 'seeded'
  const isApiView = isApiDataMode(viewState)

  const seededEvents = useMemo(
    () => filterEvents(seededDashboardEvents, filters),
    [filters],
  )

  const seededCrmSyncIssuesEvents = useMemo(
    () => sortByLastCrmAttempt(seededEvents.filter(hasCrmSyncIssue)),
    [seededEvents],
  )

  const seededCheckoutAttemptsFiltered = useMemo(
    () => filterCheckoutAttempts(seededCheckoutAttempts, checkoutAttemptsFilters),
    [checkoutAttemptsFilters],
  )

  const displayCheckoutAttempts = isSeededView
    ? seededCheckoutAttemptsFiltered
    : liveCheckoutAttempts

  const activeSelectedAttemptId = useMemo(() => {
    if (
      selectedAttemptId &&
      displayCheckoutAttempts.some(
        (attempt) => attempt.donation_attempt_id === selectedAttemptId,
      )
    ) {
      return selectedAttemptId
    }

    return displayCheckoutAttempts[0]?.donation_attempt_id ?? null
  }, [selectedAttemptId, displayCheckoutAttempts])

  const displayEvents = isSeededView ? seededEvents : liveEvents
  const displayCrmSyncIssuesEvents = useMemo(() => {
    const base = isSeededView ? seededCrmSyncIssuesEvents : crmSyncIssuesEvents

    return filterCrmSyncIssuesBySearch(base, filters.search)
  }, [isSeededView, seededCrmSyncIssuesEvents, crmSyncIssuesEvents, filters.search])

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
    if (!isApiView) {
      setHealthReady(null)
      setHealthError(null)
      setIsLoadingHealth(false)
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadHealth(): Promise<void> {
      setIsLoadingHealth(true)
      setHealthError(null)

      try {
        const response = await fetchHealthReady()
        if (!cancelled) {
          setHealthReady(response)
        }
      } catch (error) {
        if (!cancelled) {
          setHealthReady(null)
          setHealthError(
            error instanceof Error ? error.message : 'Could not load system health status.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingHealth(false)
        }
      }
    }

    void loadHealth()

    return () => {
      cancelled = true
    }
  }, [viewState, isApiView, healthReloadToken])

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
    if (!isApiView || dashboardSection !== 'crm-sync-issues') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadCrmSyncIssues(): Promise<void> {
      setIsLoadingCrmSyncIssues(true)
      setCrmSyncIssuesError(null)

      try {
        const response = await fetchDashboardEvents(filters, 1, { retryActivity: true })
        if (cancelled) {
          return
        }

        setCrmSyncIssuesEvents(sortByLastCrmAttempt(response.data))
      } catch (error) {
        if (cancelled) {
          return
        }

        setCrmSyncIssuesEvents([])
        setCrmSyncIssuesError(
          error instanceof Error ? error.message : 'Could not load CRM sync issues.',
        )
      } finally {
        if (!cancelled) {
          setIsLoadingCrmSyncIssues(false)
        }
      }
    }

    void loadCrmSyncIssues()

    return () => {
      cancelled = true
    }
  }, [viewState, filters, reloadToken, isApiView, dashboardSection])

  useEffect(() => {
    if (!isApiView || dashboardSection !== 'checkout-attempts') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadCheckoutAttempts(): Promise<void> {
      setIsLoadingCheckoutAttempts(true)
      setCheckoutAttemptsError(null)

      try {
        const response = await fetchDashboardCheckoutAttempts(checkoutAttemptsFilters)
        if (cancelled) {
          return
        }

        setLiveCheckoutAttempts(response.data)
        setSelectedAttemptId((current) => {
          if (
            current &&
            response.data.some((attempt) => attempt.donation_attempt_id === current)
          ) {
            return current
          }

          return response.data[0]?.donation_attempt_id ?? null
        })
      } catch (error) {
        if (cancelled) {
          return
        }

        setLiveCheckoutAttempts([])
        setSelectedAttemptId(null)
        setAttemptTrace(null)
        setCheckoutAttemptsError(
          error instanceof Error ? error.message : 'Could not load checkout attempts.',
        )
      } finally {
        if (!cancelled) {
          setIsLoadingCheckoutAttempts(false)
        }
      }
    }

    void loadCheckoutAttempts()

    return () => {
      cancelled = true
    }
  }, [viewState, checkoutAttemptsFilters, reloadToken, isApiView, dashboardSection])

  useEffect(() => {
    if (
      dashboardSection !== 'checkout-attempts' ||
      activeSelectedAttemptId === null ||
      isSeededView
    ) {
      return
    }

    if (!isApiView) {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))
    setAttemptLookupQuery(activeSelectedAttemptId)
    setAttemptLookupMode('attempt')

    async function loadTraceForSelection(): Promise<void> {
      setIsLoadingAttemptTrace(true)
      setAttemptTraceError(null)
      setHandoffReconcileError(null)

      try {
        const trace = await fetchDashboardEventByAttempt(activeSelectedAttemptId!)
        if (!cancelled) {
          setAttemptTrace(trace)
        }
      } catch (error) {
        if (!cancelled) {
          setAttemptTrace(null)
          setAttemptTraceError(
            error instanceof Error ? error.message : 'Could not load attempt trace.',
          )
        }
      } finally {
        if (!cancelled) {
          setIsLoadingAttemptTrace(false)
        }
      }
    }

    void loadTraceForSelection()

    return () => {
      cancelled = true
    }
  }, [
    viewState,
    activeSelectedAttemptId,
    isApiView,
    isSeededView,
    dashboardSection,
    reloadToken,
  ])

  useEffect(() => {
    if (!isSeededView || dashboardSection !== 'checkout-attempts') {
      return
    }

    if (activeSelectedAttemptId === null) {
      setAttemptTrace(null)
      return
    }

    const attempt = displayCheckoutAttempts.find(
      (row) => row.donation_attempt_id === activeSelectedAttemptId,
    )

    if (!attempt) {
      setAttemptTrace(null)
      return
    }

    setAttemptLookupQuery(activeSelectedAttemptId)
    setAttemptLookupMode('attempt')
    setAttemptTrace({
      donation_attempt_id: attempt.donation_attempt_id,
      handoff: attempt.handoff,
      checkout_event: null,
      integration_steps: findSeededIntegrationSteps(attempt.donation_attempt_id),
    })
    setAttemptTraceError(null)
    setHandoffReconcileError(null)
  }, [
    isSeededView,
    dashboardSection,
    activeSelectedAttemptId,
    displayCheckoutAttempts,
  ])

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
    setCrmSyncIssuesEvents((events) => {
      const next = events.map((event) =>
        event.checkout_event_id === updated.checkout_event_id ? summary : event,
      )

      return hasCrmSyncIssue(summary)
        ? sortByLastCrmAttempt(next)
        : sortByLastCrmAttempt(next.filter((event) => event.checkout_event_id !== updated.checkout_event_id))
    })
  }

  async function handleCrmSyncIssueRetry(event: CheckoutEventSummary): Promise<void> {
    const attemptId = event.crm_sync.crm_sync_attempt_id
    if (attemptId === null || attemptId === undefined || isSeededView) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setCrmRetryingEventId(event.checkout_event_id)
    setCrmRetryError(null)

    try {
      const updated = await fetchCrmSyncRetry(attemptId)
      updateEventInLists(updated)

      if (!hasCrmSyncIssue(updated)) {
        setCrmSyncIssuesFocusAttemptId(null)
        setFilters((current) => ({ ...current, search: '' }))
      }
    } catch (error) {
      setCrmRetryError(error instanceof Error ? error.message : 'CRM sync retry failed.')
    } finally {
      setCrmRetryingEventId(null)
    }
  }

  function openCrmSyncIssuesFromEvent(donationAttemptId: string | null | undefined): void {
    if (!donationAttemptId) {
      return
    }

    setFilters((current) => ({ ...current, search: donationAttemptId }))
    setCrmSyncIssuesFocusAttemptId(donationAttemptId)
    setCrmRetryError(null)
    setDashboardSection('crm-sync-issues')
  }

  function handleDashboardSectionChange(section: DashboardSection): void {
    setDashboardSection(section)

    if (section !== 'crm-sync-issues') {
      setCrmSyncIssuesFocusAttemptId(null)
    }
  }

  function refreshHealthStatus(): void {
    setHealthReloadToken((token) => token + 1)
  }

  const displayHealth = isSeededView ? seededHealthStatus : healthReady

  async function handleAttemptLookup(): Promise<void> {
    const query = attemptLookupQuery.trim()
    if (!query || isSeededView) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setIsLoadingAttemptTrace(true)
    setAttemptTraceError(null)
    setHandoffReconcileError(null)

    try {
      const trace =
        attemptLookupMode === 'cart'
          ? await fetchDashboardEventByCart(query)
          : await fetchDashboardEventByAttempt(query)
      setAttemptTrace(trace)
      setSelectedAttemptId(trace.donation_attempt_id)
    } catch (error) {
      setAttemptTrace(null)
      setAttemptTraceError(
        error instanceof Error ? error.message : 'Could not load attempt trace.',
      )
    } finally {
      setIsLoadingAttemptTrace(false)
    }
  }

  async function handleHandoffReconcile(donationAttemptId: string): Promise<void> {
    if (isSeededView) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setIsHandoffReconciling(true)
    setHandoffReconcileError(null)

    try {
      const trace = await fetchHandoffReconcile(donationAttemptId)
      setAttemptTrace(trace)

      if (trace.checkout_event) {
        updateEventInLists(trace.checkout_event)
        setSelectedId(trace.checkout_event.checkout_event_id)
        setSelectedDetail(trace.checkout_event)
        setLiveCheckoutAttempts((attempts) =>
          attempts.filter((attempt) => attempt.donation_attempt_id !== donationAttemptId),
        )
        setSelectedAttemptId((current) =>
          current === donationAttemptId ? null : current,
        )
        setReloadToken((token) => token + 1)
      } else {
        setLiveCheckoutAttempts((attempts) =>
          attempts.map((attempt) =>
            attempt.donation_attempt_id === donationAttemptId && trace.handoff
              ? { ...attempt, handoff: trace.handoff }
              : attempt,
          ),
        )
      }
    } catch (error) {
      setHandoffReconcileError(
        error instanceof Error ? error.message : 'Handoff reconcile failed.',
      )
    } finally {
      setIsHandoffReconciling(false)
    }
  }

  function openEventFromCrmSyncIssues(checkoutEventId: number): void {
    setSelectedId(checkoutEventId)
    setCrmSyncIssuesFocusAttemptId(null)
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
          setCrmSyncIssuesError(null)

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

  const crmSyncIssuesHint = (
    <>
      CRM sync issues lists completed donations whose HubSpot sync row shows failures, retryable
      errors, prior retries, or a newsletter list warning such as{' '}
      <code className="rounded bg-slate-800 px-1 py-0.5">hubspot_list_warning</code>. Use{' '}
      <strong className="font-medium text-slate-400">Retry</strong> here to run manual CRM sync
      actions. Rows link to the checkout event by{' '}
      <strong className="font-medium text-slate-400">donation attempt id</strong> or{' '}
      <strong className="font-medium text-slate-400">View event</strong>.
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

  const checkoutAttemptsHint = (
    <>
      Lists click-time handoffs with no linked checkout event yet — common for pending checkouts,
      gateway declines, and abandoned attempts. Use trace lookup for a specific attempt id or Foxy
      cart id from the error log.
    </>
  )

  let content

  if (dashboardSection === 'system-status') {
    if (viewState === 'loading') {
      content = <LoadingState />
    } else if (viewState === 'error') {
      content = (
        <ErrorState
          message="Preview error state for the dashboard shell."
          onRetry={() => setViewState('hosted-api')}
        />
      )
    } else if (viewState === 'empty') {
      content = (
        <EmptyState
          title="No system status preview"
          message="Switch to seeded, local API, or hosted API view mode."
          onResetFilters={() => setViewState('seeded')}
        />
      )
    } else if (isApiView && isLoadingHealth && !healthReady) {
      content = <LoadingState />
    } else if (isApiView && healthError && !healthReady) {
      content = (
        <ErrorState
          message={healthError}
          onRetry={refreshHealthStatus}
        />
      )
    } else if (displayHealth) {
      content = (
        <SystemStatusPanel
          health={displayHealth}
          isRefreshing={isLoadingHealth}
          onRefresh={refreshHealthStatus}
          isPreview={isSeededView}
        />
      )
    } else {
      content = <LoadingState />
    }
  } else if (dashboardSection === 'analytics-events') {
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
  } else if (dashboardSection === 'crm-sync-issues') {
    if (viewState === 'loading' || (isApiView && isLoadingCrmSyncIssues && displayCrmSyncIssuesEvents.length === 0)) {
      content = <LoadingState />
    } else if (viewState === 'error' || (isApiView && crmSyncIssuesError)) {
      content = (
        <ErrorState
          message={
            crmSyncIssuesError ??
            'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
          }
          onRetry={() => {
            setViewState('hosted-api')
            setReloadToken((token) => token + 1)
          }}
        />
      )
    } else if (viewState === 'empty' || displayCrmSyncIssuesEvents.length === 0) {
      content = (
        <EmptyState onResetFilters={() => setFilters(defaultFilters)} />
      )
    } else {
      content = (
        <div className="space-y-3">
          {crmRetryError ? (
            <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200" role="alert">
              {crmRetryError}
            </p>
          ) : null}
          <CrmSyncIssuesTable
            events={displayCrmSyncIssuesEvents}
            focusAttemptId={crmSyncIssuesFocusAttemptId}
            onOpenEvent={openEventFromCrmSyncIssues}
            onRetry={handleCrmSyncIssueRetry}
            retryingEventId={crmRetryingEventId}
            retryDisabled={isSeededView}
          />
        </div>
      )
    }
  } else if (dashboardSection === 'checkout-attempts') {
    if (
      viewState === 'loading' ||
      (isApiView && isLoadingCheckoutAttempts && displayCheckoutAttempts.length === 0)
    ) {
      content = <LoadingState />
    } else if (viewState === 'error' || (isApiView && checkoutAttemptsError)) {
      content = (
        <ErrorState
          message={
            checkoutAttemptsError ??
            'Could not reach the Laravel dashboard API. Start middleware with php artisan serve.'
          }
          onRetry={() => {
            setViewState('hosted-api')
            setReloadToken((token) => token + 1)
          }}
        />
      )
    } else if (viewState === 'empty' || displayCheckoutAttempts.length === 0) {
      content = (
        <div className="space-y-4">
          <EmptyState
            title="No unlinked checkout attempts"
            message="Handoffs appear here when a donation click registered but no checkout event is linked yet. Try a donation from the campaign site or search by attempt id below."
            onResetFilters={() => setCheckoutAttemptsFilters(defaultCheckoutAttemptsFilters)}
          />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
            <div />
            <div className="space-y-4">
              <AttemptLookupBar
                query={attemptLookupQuery}
                mode={attemptLookupMode}
                onQueryChange={setAttemptLookupQuery}
                onModeChange={setAttemptLookupMode}
                onLookup={() => void handleAttemptLookup()}
                isLoading={isLoadingAttemptTrace}
                disabled={isSeededView}
              />
              {attemptTraceError ? (
                <ErrorState
                  message={attemptTraceError}
                  onRetry={() => void handleAttemptLookup()}
                />
              ) : (
                <AttemptTracePanel
                  trace={attemptTrace}
                  onReconcile={
                    attemptTrace
                      ? async () => {
                          await handleHandoffReconcile(attemptTrace.donation_attempt_id)
                        }
                      : undefined
                  }
                  isReconciling={isHandoffReconciling}
                  reconcileError={handoffReconcileError}
                  reconcileDisabled={isSeededView}
                  onOpenCrmSyncIssues={
                    attemptTrace?.checkout_event?.donation_attempt_id
                      ? () =>
                          openCrmSyncIssuesFromEvent(
                            attemptTrace?.checkout_event?.donation_attempt_id,
                          )
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </div>
      )
    } else {
      content = (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
          <CheckoutAttemptsTable
            attempts={displayCheckoutAttempts}
            selectedAttemptId={activeSelectedAttemptId}
            onSelect={setSelectedAttemptId}
          />
          <div className="space-y-4">
            <AttemptLookupBar
              query={attemptLookupQuery}
              mode={attemptLookupMode}
              onQueryChange={setAttemptLookupQuery}
              onModeChange={setAttemptLookupMode}
              onLookup={() => void handleAttemptLookup()}
              isLoading={isLoadingAttemptTrace}
              disabled={isSeededView}
            />
            {attemptTraceError ? (
              <ErrorState
                message={attemptTraceError}
                onRetry={() => void handleAttemptLookup()}
              />
            ) : isLoadingAttemptTrace && isApiView ? (
              <LoadingState />
            ) : (
              <AttemptTracePanel
                trace={attemptTrace}
                onReconcile={
                  attemptTrace
                    ? async () => {
                        await handleHandoffReconcile(attemptTrace.donation_attempt_id)
                      }
                    : undefined
                }
                isReconciling={isHandoffReconciling}
                reconcileError={handoffReconcileError}
                reconcileDisabled={isSeededView}
                onOpenCrmSyncIssues={
                  attemptTrace?.checkout_event?.donation_attempt_id
                    ? () =>
                        openCrmSyncIssuesFromEvent(
                          attemptTrace?.checkout_event?.donation_attempt_id,
                        )
                    : undefined
                }
              />
            )}
          </div>
        </div>
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
              onOpenCrmSyncIssues={
                (isSeededView ? seededDetail : selectedDetail)?.donation_attempt_id
                  ? () =>
                      openCrmSyncIssuesFromEvent(
                        (isSeededView ? seededDetail : selectedDetail)?.donation_attempt_id,
                      )
                  : undefined
              }
              onHandoffReconcile={
                isSeededView || !selectedDetail?.donation_attempt_id
                  ? undefined
                  : async () => {
                      await handleHandoffReconcile(selectedDetail.donation_attempt_id!)
                    }
              }
              isHandoffReconciling={isHandoffReconciling}
              handoffReconcileError={handoffReconcileError}
              handoffReconcileDisabled={isSeededView}
            />
          )}
        </div>
      )
    }
  }

  return (
    <Layout
      previewControl={previewControl}
      systemStatusBar={
        <SystemStatusBar
          health={displayHealth}
          isLoading={isLoadingHealth}
          error={healthError}
          isPreview={isSeededView}
          onOpenDetails={() => setDashboardSection('system-status')}
          onRefresh={isApiView ? refreshHealthStatus : undefined}
        />
      }
      activeSection={dashboardSection}
      onSectionChange={handleDashboardSectionChange}
    >
      <div className="space-y-4">
        {dashboardSection === 'analytics-events' ? (
          <AnalyticsFiltersBar filters={analyticsFilters} onChange={setAnalyticsFilters} />
        ) : dashboardSection === 'checkout-attempts' ? (
          <CheckoutAttemptsFiltersBar
            filters={checkoutAttemptsFilters}
            onChange={setCheckoutAttemptsFilters}
          />
        ) : dashboardSection === 'system-status' ? null : (
          <EventFiltersBar filters={filters} onChange={setFilters} />
        )}
        <p className="text-xs text-slate-500">
          {dashboardSection === 'system-status'
            ? 'Middleware readiness from GET /api/health/ready. Liveness probe stays at GET /api/health for deploy checks.'
            : dashboardSection === 'crm-sync-issues'
            ? crmSyncIssuesHint
            : dashboardSection === 'analytics-events'
              ? analyticsHint
              : dashboardSection === 'checkout-attempts'
                ? checkoutAttemptsHint
                : dataSourceHint}
        </p>
        {content}
      </div>
    </Layout>
  )
}

export default App
