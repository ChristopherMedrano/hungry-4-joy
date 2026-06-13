const analyticsSpecificKeys = [
  'event',
  'analytics_event_id',
  'event_created_at',
  'producer',
  'transaction_status',
  'crm_sync_status',
  'crm_error_code',
  'transaction_id',
] as const

export function condenseAnalyticsPayload(
  payload: Record<string, unknown>,
): Record<string, unknown> {
  const condensed: Record<string, unknown> = {}

  for (const key of analyticsSpecificKeys) {
    if (payload[key] !== undefined && payload[key] !== null) {
      condensed[key] = payload[key]
    }
  }

  return condensed
}
