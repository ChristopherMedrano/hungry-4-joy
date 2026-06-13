export type DashboardSection = 'events' | 'retry-activity' | 'analytics-events'

export const dashboardSections: {
  id: DashboardSection
  label: string
}[] = [
  { id: 'events', label: 'Checkout events' },
  { id: 'analytics-events', label: 'Server analytics' },
  { id: 'retry-activity', label: 'Retry activity' },
]
