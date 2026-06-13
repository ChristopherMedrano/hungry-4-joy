export function formatAttemptId(attemptId: string | null | undefined): string {
  if (!attemptId) {
    return '—'
  }

  if (attemptId.length <= 12) {
    return attemptId
  }

  return `...${attemptId.slice(-12)}`
}
