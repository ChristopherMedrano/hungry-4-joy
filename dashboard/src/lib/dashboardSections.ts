export type DashboardSection = 'events' | 'checkout-attempts' | 'crm-sync-issues' | 'analytics-events'

export const dashboardSections: {
  id: DashboardSection
  label: string
}[] = [
  { id: 'events', label: 'Checkout events' },
  { id: 'checkout-attempts', label: 'Checkout attempts' },
  { id: 'analytics-events', label: 'Server analytics' },
  { id: 'crm-sync-issues', label: 'CRM sync issues' },
]
