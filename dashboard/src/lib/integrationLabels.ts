import type { IntegrationStepName, IntegrationStepStatus } from '../types/integration'

const stepLabels: Record<string, string> = {
  foxy_webhook_received: 'Foxy webhook received',
  foxy_webhook_rejected: 'Foxy webhook rejected',
  checkout_event_ingested: 'Checkout event ingested',
  checkout_event_duplicate: 'Duplicate checkout event',
  handoff_registered: 'Handoff registered',
  handoff_reconcile_attempted: 'Reconcile attempted',
  crm_sync_dispatched: 'CRM sync dispatched',
  crm_sync_completed: 'CRM sync completed',
}

const statusTone: Record<IntegrationStepStatus, string> = {
  succeeded: 'text-emerald-400',
  failed: 'text-rose-400',
  skipped: 'text-slate-400',
  retryable: 'text-amber-400',
}

export function integrationStepLabel(step: IntegrationStepName): string {
  return stepLabels[step] ?? step.replaceAll('_', ' ')
}

export function integrationStepStatusClass(status: IntegrationStepStatus): string {
  return statusTone[status] ?? 'text-slate-300'
}

export function formatIntegrationTimestamp(value: string | null): string {
  if (!value) {
    return 'N/A'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString()
}
