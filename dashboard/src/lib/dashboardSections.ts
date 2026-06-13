export type DashboardSection = 'events' | 'retry-activity' | 'incidents'

export const dashboardSections: {
  id: DashboardSection
  label: string
  disabled?: boolean
}[] = [
  { id: 'events', label: 'Checkout events' },
  { id: 'retry-activity', label: 'Retry activity' },
  { id: 'incidents', label: 'Incident notes', disabled: true },
]
