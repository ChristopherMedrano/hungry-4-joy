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
  fetchHandoffReconcileOpen,
  fetchHandoffSweepUnfed,
  fetchHealthReady,
  setDashboardApiBase,
  type HandoffBatchReconcileSummary,
  type HandoffSweepUnfedSummary,
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
import { DashboardHome } from './components/DashboardHome'
import { Modal } from './components/Modal'
import { TablePagination } from './components/TablePagination'
import { usePagination } from './lib/usePagination'
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
  isApiDataMode,
  isPreviewStateMode,
  viewModeOptions,
} from './lib/dashboardDataMode'
import { defaultCheckoutAttemptsFilters } from './lib/checkoutAttemptsFilters'
import { filterCheckoutAttempts } from './lib/filterCheckoutAttempts'
import { dashboardSections, type DashboardSection } from './lib/dashboardSections'
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
  const [dashboardSection, setDashboardSection] = useState<DashboardSection>('dashboard')
  const [viewState, setViewState] = useState<DashboardDataMode>('hosted-api')
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
  const [dashboardEvents, setDashboardEvents] = useState<CheckoutEventSummary[]>([])
  const [dashboardCrmIssuesCount, setDashboardCrmIssuesCount] = useState(0)
  const [dashboardCartIssuesCount, setDashboardCartIssuesCount] = useState(0)
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
  const [isReconcilingOpenHandoffs, setIsReconcilingOpenHandoffs] = useState(false)
  const [isSweepingUnfedTransactions, setIsSweepingUnfedTransactions] = useState(false)
  const [handoffBatchSummary, setHandoffBatchSummary] = useState<
    HandoffBatchReconcileSummary | HandoffSweepUnfedSummary | null
  >(null)
  const [handoffBatchSummaryKind, setHandoffBatchSummaryKind] = useState<
    'reconcile-open' | 'sweep-unfed' | null
  >(null)
  const [handoffBatchError, setHandoffBatchError] = useState<string | null>(null)
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
  const [eventsTotal, setEventsTotal] = useState(0)
  const [crmTotal, setCrmTotal] = useState(0)
  const [analyticsTotal, setAnalyticsTotal] = useState(0)
  const [attemptsTotal, setAttemptsTotal] = useState(0)
  const [dashboardTotalEvents, setDashboardTotalEvents] = useState(0)
  const [dashboardCompletedCount, setDashboardCompletedCount] = useState(0)

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

  // Seeded CRM rows get the client-side search filter; API rows arrive already
  // filtered and paged by the server.
  const seededCrmFiltered = useMemo(
    () => filterCrmSyncIssuesBySearch(seededCrmSyncIssuesEvents, filters.search),
    [seededCrmSyncIssuesEvents, filters.search],
  )

  // Totals drive the pagers: seeded knows the full client-side count, while API
  // modes report the server `meta.total`.
  const eventsTotalCount = isSeededView ? seededEvents.length : eventsTotal
  const attemptsTotalCount = isSeededView
    ? seededCheckoutAttemptsFiltered.length
    : attemptsTotal
  const crmTotalCount = isSeededView ? seededCrmFiltered.length : crmTotal
  const analyticsTotalCount = isSeededView ? 0 : analyticsTotal

  const eventsPagination = usePagination(eventsTotalCount)
  const crmPagination = usePagination(crmTotalCount)
  const analyticsPagination = usePagination(analyticsTotalCount)
  const attemptsPagination = usePagination(attemptsTotalCount)

  // Rows for the current page: API responses are already the server page; seeded
  // data is sliced locally with the pager's offset/limit.
  const displayEvents = isSeededView
    ? seededEvents.slice(
        eventsPagination.offset,
        eventsPagination.offset + eventsPagination.limit,
      )
    : liveEvents
  const displayCheckoutAttempts = isSeededView
    ? seededCheckoutAttemptsFiltered.slice(
        attemptsPagination.offset,
        attemptsPagination.offset + attemptsPagination.limit,
      )
    : liveCheckoutAttempts
  const displayCrmSyncIssuesEvents = isSeededView
    ? seededCrmFiltered.slice(crmPagination.offset, crmPagination.offset + crmPagination.limit)
    : crmSyncIssuesEvents

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
    if (!isApiView || dashboardSection !== 'dashboard') {
      return
    }

    let cancelled = false
    setDashboardApiBase(apiBaseForMode(viewState))

    async function loadDashboardSummary(): Promise<void> {
      try {
        const [recent, completed, crm, attempts] = await Promise.all([
          fetchDashboardEvents(defaultFilters, 1, { perPage: 50 }),
          fetchDashboardEvents({ ...defaultFilters, transaction_status: 'completed' }, 1, {
            perPage: 1,
          }),
          fetchDashboardEvents(defaultFilters, 1, { retryActivity: true, perPage: 1 }),
          fetchDashboardCheckoutAttempts(defaultCheckoutAttemptsFilters, 1, 1),
        ])

        if (cancelled) {
          return
        }

        // Counts come from server `meta.total`, not the loaded page, so the cards
        // reflect the full dataset. `recent` carries the activity feed plus the
        // amount-raised and clean-synced samples (warnings excluded).
        setDashboardEvents(recent.data)
        setDashboardTotalEvents(recent.meta.total)
        setDashboardCompletedCount(completed.meta.total)
        setDashboardCrmIssuesCount(crm.meta.total)
        setDashboardCartIssuesCount(attempts.meta.total)
      } catch {
        if (!cancelled) {
          setDashboardEvents([])
          setDashboardTotalEvents(0)
          setDashboardCompletedCount(0)
          setDashboardCrmIssuesCount(0)
          setDashboardCartIssuesCount(0)
        }
      }
    }

    void loadDashboardSummary()

    return () => {
      cancelled = true
    }
  }, [viewState, isApiView, dashboardSection, reloadToken])

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
        const response = await fetchDashboardAnalyticsEvents(
          analyticsFilters,
          analyticsPagination.page,
          analyticsPagination.perPage,
        )
        if (cancelled) {
          return
        }

        setLiveAnalyticsEvents(response.data)
        setAnalyticsTotal(response.meta.total)
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
  }, [
    viewState,
    analyticsFilters,
    reloadToken,
    isApiView,
    dashboardSection,
    analyticsPagination.page,
    analyticsPagination.perPage,
  ])

  useEffect(() => {
    if (
      !isApiView ||
      dashboardSection !== 'analytics-events' ||
      !isAnalyticsModalOpen ||
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
  }, [viewState, activeSelectedAnalyticsId, isApiView, dashboardSection, isAnalyticsModalOpen])

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
        const response = await fetchDashboardEvents(filters, eventsPagination.page, {
          perPage: eventsPagination.perPage,
        })
        if (cancelled) {
          return
        }

        setLiveEvents(response.data)
        setEventsTotal(response.meta.total)
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
  }, [
    viewState,
    filters,
    reloadToken,
    isApiView,
    dashboardSection,
    eventsPagination.page,
    eventsPagination.perPage,
  ])

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
        const response = await fetchDashboardEvents(filters, crmPagination.page, {
          retryActivity: true,
          perPage: crmPagination.perPage,
        })
        if (cancelled) {
          return
        }

        setCrmSyncIssuesEvents(sortByLastCrmAttempt(response.data))
        setCrmTotal(response.meta.total)
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
  }, [
    viewState,
    filters,
    reloadToken,
    isApiView,
    dashboardSection,
    crmPagination.page,
    crmPagination.perPage,
  ])

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
        const response = await fetchDashboardCheckoutAttempts(
          checkoutAttemptsFilters,
          attemptsPagination.page,
          attemptsPagination.perPage,
        )
        if (cancelled) {
          return
        }

        setLiveCheckoutAttempts(response.data)
        setAttemptsTotal(response.meta.total)
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
  }, [
    viewState,
    checkoutAttemptsFilters,
    reloadToken,
    isApiView,
    dashboardSection,
    attemptsPagination.page,
    attemptsPagination.perPage,
  ])

  useEffect(() => {
    if (
      dashboardSection !== 'checkout-attempts' ||
      !isAttemptModalOpen ||
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
    isAttemptModalOpen,
    reloadToken,
  ])

  useEffect(() => {
    if (!isSeededView || dashboardSection !== 'checkout-attempts' || !isAttemptModalOpen) {
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
    isAttemptModalOpen,
    activeSelectedAttemptId,
    displayCheckoutAttempts,
  ])

  useEffect(() => {
    if (
      !isApiView ||
      dashboardSection !== 'events' ||
      !isEventModalOpen ||
      activeSelectedId === null
    ) {
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
  }, [viewState, activeSelectedId, isApiView, dashboardSection, isEventModalOpen])

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
    resetAllPagination()

    if (section !== 'crm-sync-issues') {
      setCrmSyncIssuesFocusAttemptId(null)
    }
  }

  function resetAllPagination(): void {
    eventsPagination.reset()
    crmPagination.reset()
    analyticsPagination.reset()
    attemptsPagination.reset()
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
      setIsAttemptModalOpen(true)
    } catch (error) {
      setAttemptTrace(null)
      setAttemptTraceError(
        error instanceof Error ? error.message : 'Could not load attempt trace.',
      )
      setIsAttemptModalOpen(true)
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

  async function handleReconcileOpenHandoffs(): Promise<void> {
    if (isSeededView) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setIsReconcilingOpenHandoffs(true)
    setHandoffBatchError(null)
    setHandoffBatchSummary(null)
    setHandoffBatchSummaryKind(null)

    try {
      const summary = await fetchHandoffReconcileOpen()
      setHandoffBatchSummary(summary)
      setHandoffBatchSummaryKind('reconcile-open')
      setReloadToken((token) => token + 1)
    } catch (error) {
      setHandoffBatchError(
        error instanceof Error ? error.message : 'Open handoff reconcile failed.',
      )
    } finally {
      setIsReconcilingOpenHandoffs(false)
    }
  }

  async function handleSweepUnfedTransactions(): Promise<void> {
    if (isSeededView) {
      return
    }

    setDashboardApiBase(apiBaseForMode(viewState))
    setIsSweepingUnfedTransactions(true)
    setHandoffBatchError(null)
    setHandoffBatchSummary(null)
    setHandoffBatchSummaryKind(null)

    try {
      const summary = await fetchHandoffSweepUnfed()
      setHandoffBatchSummary(summary)
      setHandoffBatchSummaryKind('sweep-unfed')
      setReloadToken((token) => token + 1)
    } catch (error) {
      setHandoffBatchError(
        error instanceof Error ? error.message : 'Unfed transaction sweep failed.',
      )
    } finally {
      setIsSweepingUnfedTransactions(false)
    }
  }

  function openEventFromCrmSyncIssues(checkoutEventId: number): void {
    setSelectedId(checkoutEventId)
    setCrmSyncIssuesFocusAttemptId(null)
    setDashboardSection('events')
    setIsEventModalOpen(true)
  }

  function handleViewEvent(checkoutEventId: number): void {
    setSelectedId(checkoutEventId)
    setIsEventModalOpen(true)
  }

  function handleViewAttempt(donationAttemptId: string): void {
    setSelectedAttemptId(donationAttemptId)
    setIsAttemptModalOpen(true)
  }

  function handleAttemptsFilterChange(next: CheckoutAttemptsFilters): void {
    setCheckoutAttemptsFilters(next)
    attemptsPagination.reset()
  }

  function handleEventFiltersChange(next: EventFilters): void {
    setFilters(next)
    eventsPagination.reset()
    crmPagination.reset()
  }

  function handleAnalyticsFiltersChange(next: AnalyticsFilters): void {
    setAnalyticsFilters(next)
    analyticsPagination.reset()
  }

  function handleViewAnalytics(analyticsId: number): void {
    setSelectedAnalyticsId(analyticsId)
    setIsAnalyticsModalOpen(true)
  }

  const previewControl = (
    <label className="flex items-center gap-2 text-sm text-slate-400">
      <span className="hidden text-xs font-medium uppercase tracking-wide lg:inline">
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
          resetAllPagination()

          if (nextView === 'seeded') {
            const nextEvents = filterEvents(seededDashboardEvents, filters)
            setSelectedId(nextEvents[0]?.checkout_event_id ?? null)
          }
        }}
        className="rounded-md border border-slate-700 bg-slate-950/60 px-2.5 py-1.5 text-sm text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
      >
        <optgroup label="Data source">
          {viewModeOptions()
            .filter((option) => !isPreviewStateMode(option.value))
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </optgroup>
        <optgroup label="Preview states">
          {viewModeOptions()
            .filter((option) => isPreviewStateMode(option.value))
            .map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
        </optgroup>
      </select>
    </label>
  )

  const dataSourceHint = isSeededView
    ? 'Offline preview rows covering every transaction and CRM badge state — no network calls.'
    : 'Checkout events ingested from Foxy, with each donation’s transaction and CRM sync state.'

  const crmSyncIssuesHint =
    'Completed donations whose HubSpot sync failed, is retryable, or raised a list warning. Retry here, or open the linked checkout event.'

  const analyticsHint =
    'Server-side conversion records Laravel emits after checkout ingest and CRM sync. Open a row for the full contract payload.'

  const checkoutAttemptsHint =
    'Donation handoffs that registered at click time but aren’t yet linked to a checkout event — typically pending checkouts, gateway declines, or abandoned carts.'

  const dashboardHomeEvents = isSeededView ? seededDashboardEvents : dashboardEvents
  const dashboardHomeTotalEvents = isSeededView
    ? seededDashboardEvents.length
    : dashboardTotalEvents
  const dashboardHomeCompleted = isSeededView
    ? seededDashboardEvents.filter((event) => event.transaction_status === 'completed').length
    : dashboardCompletedCount
  // "Synced" means the clean synced summary — warnings (e.g. list-enrollment
  // failures) are sync issues, not synced. Counted from the loaded sample so
  // warnings are excluded the same way in seeded and API modes.
  const dashboardHomeSynced = dashboardHomeEvents.filter(
    (event) => event.crm_status_summary === 'synced',
  ).length
  const dashboardHomeCrmIssues = isSeededView
    ? seededDashboardEvents.filter(hasCrmSyncIssue).length
    : dashboardCrmIssuesCount
  const dashboardHomeCartIssues = isSeededView
    ? seededCheckoutAttempts.length
    : dashboardCartIssuesCount

  let content

  if (dashboardSection === 'dashboard') {
    content = (
      <DashboardHome
        isPreview={isSeededView}
        health={displayHealth}
        events={dashboardHomeEvents}
        totalEvents={dashboardHomeTotalEvents}
        donationsCaptured={dashboardHomeCompleted}
        syncedCount={dashboardHomeSynced}
        crmSyncIssuesCount={dashboardHomeCrmIssues}
        cartSyncIssuesCount={dashboardHomeCartIssues}
        onNavigate={handleDashboardSectionChange}
        onViewEvent={(id) => {
          setSelectedId(id)
          setDashboardSection('events')
          setIsEventModalOpen(true)
        }}
      />
    )
  } else if (dashboardSection === 'system-status') {
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
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
          <AnalyticsEventTable
            events={liveAnalyticsEvents}
            selectedId={isAnalyticsModalOpen ? activeSelectedAnalyticsId : null}
            onView={handleViewAnalytics}
            embedded
          />
          <TablePagination
            total={analyticsPagination.total}
            page={analyticsPagination.page}
            pageSize={analyticsPagination.pageSize}
            onPageChange={analyticsPagination.setPage}
            onPageSizeChange={analyticsPagination.setPageSize}
          />
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
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
          {crmRetryError ? (
            <p
              className="border-b border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200"
              role="alert"
            >
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
            embedded
          />
          <TablePagination
            total={crmPagination.total}
            page={crmPagination.page}
            pageSize={crmPagination.pageSize}
            onPageChange={crmPagination.setPage}
            onPageSizeChange={crmPagination.setPageSize}
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
          <AttemptLookupBar
            query={attemptLookupQuery}
            mode={attemptLookupMode}
            onQueryChange={setAttemptLookupQuery}
            onModeChange={setAttemptLookupMode}
            onLookup={() => void handleAttemptLookup()}
            isLoading={isLoadingAttemptTrace}
            disabled={isSeededView}
          />
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
            <CheckoutAttemptsFiltersBar
              filters={checkoutAttemptsFilters}
              onChange={handleAttemptsFilterChange}
              onReconcileOpen={handleReconcileOpenHandoffs}
              onSweepUnfed={handleSweepUnfedTransactions}
              isReconcilingOpen={isReconcilingOpenHandoffs}
              isSweepingUnfed={isSweepingUnfedTransactions}
              batchActionsDisabled={isSeededView}
              batchSummary={handoffBatchSummary}
              batchSummaryKind={handoffBatchSummaryKind}
              batchError={handoffBatchError}
            />
            <div className="p-4">
              <EmptyState
                title="No unlinked attempts"
                message="Run a donation from the campaign site, use a bulk action above, or trace a specific id at the top."
                onResetFilters={() => handleAttemptsFilterChange(defaultCheckoutAttemptsFilters)}
              />
            </div>
          </div>
        </div>
      )
    } else {
      content = (
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
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
            <CheckoutAttemptsFiltersBar
              filters={checkoutAttemptsFilters}
              onChange={handleAttemptsFilterChange}
              onReconcileOpen={handleReconcileOpenHandoffs}
              onSweepUnfed={handleSweepUnfedTransactions}
              isReconcilingOpen={isReconcilingOpenHandoffs}
              isSweepingUnfed={isSweepingUnfedTransactions}
              batchActionsDisabled={isSeededView}
              batchSummary={handoffBatchSummary}
              batchSummaryKind={handoffBatchSummaryKind}
              batchError={handoffBatchError}
            />
            <CheckoutAttemptsTable
              attempts={displayCheckoutAttempts}
              selectedAttemptId={isAttemptModalOpen ? activeSelectedAttemptId : null}
              onView={handleViewAttempt}
              embedded
            />
            <TablePagination
              total={attemptsPagination.total}
              page={attemptsPagination.page}
              pageSize={attemptsPagination.pageSize}
              onPageChange={attemptsPagination.setPage}
              onPageSizeChange={attemptsPagination.setPageSize}
            />
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
        <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40">
          <EventTable
            events={displayEvents}
            selectedId={isEventModalOpen ? activeSelectedId : null}
            onView={handleViewEvent}
            embedded
          />
          <TablePagination
            total={eventsPagination.total}
            page={eventsPagination.page}
            pageSize={eventsPagination.pageSize}
            onPageChange={eventsPagination.setPage}
            onPageSizeChange={eventsPagination.setPageSize}
          />
        </div>
      )
    }
  }

  const activeSectionLabel =
    dashboardSections.find((section) => section.id === dashboardSection)?.label ?? ''

  const seededEventForModal = isSeededView ? seededDetail : null
  const liveEventForModal = activeSelectedId === null ? null : selectedDetail
  const modalEvent = isSeededView ? seededEventForModal : liveEventForModal

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
        <h1 className="text-xl font-semibold text-white">{activeSectionLabel}</h1>

        {dashboardSection === 'dashboard' ? (
          content
        ) : (
          <>
            {dashboardSection === 'analytics-events' ? (
              <AnalyticsFiltersBar
                filters={analyticsFilters}
                onChange={handleAnalyticsFiltersChange}
              />
            ) : dashboardSection === 'checkout-attempts' ? null : dashboardSection ===
              'system-status' ? null : (
              <EventFiltersBar filters={filters} onChange={handleEventFiltersChange} />
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
          </>
        )}
      </div>

      <Modal
        open={isEventModalOpen}
        title="Checkout event"
        onClose={() => setIsEventModalOpen(false)}
      >
        {detailError && !isSeededView ? (
          <ErrorState message={detailError} onRetry={() => setSelectedId((id) => id)} />
        ) : isLoadingDetail && !isSeededView ? (
          <LoadingState />
        ) : (
          <EventDetailPanel
            event={modalEvent}
            embedded
            onOpenCrmSyncIssues={
              modalEvent?.donation_attempt_id
                ? () => {
                    setIsEventModalOpen(false)
                    openCrmSyncIssuesFromEvent(modalEvent.donation_attempt_id)
                  }
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
      </Modal>

      <Modal
        open={isAttemptModalOpen}
        title="Attempt trace"
        onClose={() => setIsAttemptModalOpen(false)}
      >
        {attemptTraceError ? (
          <ErrorState message={attemptTraceError} onRetry={() => void handleAttemptLookup()} />
        ) : isLoadingAttemptTrace && isApiView ? (
          <LoadingState />
        ) : (
          <AttemptTracePanel
            embedded
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
                ? () => {
                    setIsAttemptModalOpen(false)
                    openCrmSyncIssuesFromEvent(attemptTrace?.checkout_event?.donation_attempt_id)
                  }
                : undefined
            }
          />
        )}
      </Modal>

      <Modal
        open={isAnalyticsModalOpen}
        title="Server analytics event"
        onClose={() => setIsAnalyticsModalOpen(false)}
      >
        {analyticsDetailError ? (
          <ErrorState
            message={analyticsDetailError}
            onRetry={() => setSelectedAnalyticsId((id) => id)}
          />
        ) : isLoadingAnalyticsDetail ? (
          <LoadingState />
        ) : (
          <AnalyticsEventDetailPanel event={selectedAnalyticsDetail} embedded />
        )}
      </Modal>
    </Layout>
  )
}

export default App
