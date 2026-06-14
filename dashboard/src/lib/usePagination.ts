import { useState } from 'react'
import { pageCountFor, type PageSize } from './pagination'

/** per_page value sent to the API when the user picks "All". */
export const ALL_PER_PAGE = 1000

export interface Pagination {
  /** Page clamped to the available range. */
  page: number
  pageSize: PageSize
  total: number
  pageCount: number
  /** Zero-based index of the first row of the page — for client-side slicing. */
  offset: number
  /** Rows on a full page — for client-side slicing. */
  limit: number
  /** per_page value to request from a server-paged API. */
  perPage: number
  setPage: (page: number) => void
  setPageSize: (size: PageSize) => void
  /** Jump back to the first page (e.g. after a filter change). */
  reset: () => void
}

/**
 * Pagination state driven by a known total. Works for both server-paged lists
 * (use `page`/`perPage` to fetch, pass the server `meta.total` as `total`) and
 * client-side lists (slice with `offset`/`limit`).
 */
export function usePagination(total: number, initialSize: PageSize = 25): Pagination {
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState<PageSize>(initialSize)

  const pageCount = pageCountFor(total, pageSize)
  const currentPage = Math.min(page, pageCount)
  const limit = pageSize === 'all' ? Math.max(total, 1) : pageSize
  const offset = pageSize === 'all' ? 0 : (currentPage - 1) * pageSize
  const perPage = pageSize === 'all' ? ALL_PER_PAGE : pageSize

  function setPage(next: number): void {
    setPageState(Math.min(Math.max(1, next), pageCount))
  }

  function setPageSize(size: PageSize): void {
    setPageSizeState(size)
    setPageState(1)
  }

  function reset(): void {
    setPageState(1)
  }

  return {
    page: currentPage,
    pageSize,
    total,
    pageCount,
    offset,
    limit,
    perPage,
    setPage,
    setPageSize,
    reset,
  }
}
