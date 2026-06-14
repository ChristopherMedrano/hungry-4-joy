import type { IconName } from '../components/Icon'

export type DashboardSection =
  | 'dashboard'
  | 'system-status'
  | 'events'
  | 'checkout-attempts'
  | 'crm-sync-issues'
  | 'analytics-events'

export type DashboardSectionGroup = 'primary' | 'secondary'

export interface DashboardSectionConfig {
  id: DashboardSection
  label: string
  icon: IconName
  group: DashboardSectionGroup
}

export const dashboardSections: DashboardSectionConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', group: 'primary' },
  { id: 'events', label: 'Events', icon: 'events', group: 'primary' },
  { id: 'checkout-attempts', label: 'Cart Sync Issues', icon: 'cart-sync', group: 'primary' },
  { id: 'crm-sync-issues', label: 'CRM Sync Issues', icon: 'crm-sync', group: 'primary' },
  { id: 'analytics-events', label: 'Server Analytics', icon: 'analytics', group: 'secondary' },
  { id: 'system-status', label: 'System status', icon: 'system-status', group: 'secondary' },
]
