export type PageSize = number | 'all'

export function pageCountFor(total: number, pageSize: PageSize): number {
  if (pageSize === 'all') {
    return 1
  }

  return Math.max(1, Math.ceil(total / pageSize))
}
