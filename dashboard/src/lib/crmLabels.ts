export type CrmErrorCode =
  | 'hubspot_retryable_error'
  | 'hubspot_terminal_error'
  | 'hubspot_list_warning'

const errorCodeLabels: Record<CrmErrorCode, string> = {
  hubspot_retryable_error: 'Retryable HubSpot error',
  hubspot_terminal_error: 'Terminal HubSpot error',
  hubspot_list_warning: 'Newsletter list enrollment warning',
}

export function crmErrorCodeLabel(code: string | null): string | null {
  if (!code) {
    return null
  }

  return errorCodeLabels[code as CrmErrorCode] ?? code
}

export function formatDashboardTimestamp(iso: string | null): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
