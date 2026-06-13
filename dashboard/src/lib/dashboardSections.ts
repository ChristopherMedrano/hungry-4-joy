export type DashboardSection = 'events' | 'retry-activity'

export const dashboardSections: {
  id: DashboardSection
  label: string
}[] = [
  { id: 'events', label: 'Checkout events' },
  { id: 'retry-activity', label: 'Retry activity' },
]
