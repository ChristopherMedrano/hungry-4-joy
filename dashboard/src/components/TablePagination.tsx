import { pageCountFor, type PageSize } from '../lib/pagination'

interface TablePaginationProps {
  total: number
  page: number
  pageSize: PageSize
  onPageChange: (page: number) => void
  onPageSizeChange: (size: PageSize) => void
  pageSizeOptions?: PageSize[]
}

const selectClass =
  'rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-xs text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500'

const buttonClass =
  'rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent'

export function TablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100, 'all'],
}: TablePaginationProps) {
  const pageCount = pageCountFor(total, pageSize)
  const size = pageSize === 'all' ? total : pageSize
  const start = total === 0 ? 0 : (page - 1) * size + 1
  const end = pageSize === 'all' ? total : Math.min(page * size, total)

  return (
    <div className="flex flex-col gap-3 border-t border-slate-800 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-xs text-slate-400">
        <span>Rows per page</span>
        <select
          value={pageSize === 'all' ? 'all' : String(pageSize)}
          onChange={(event) => {
            const value = event.target.value
            onPageSizeChange(value === 'all' ? 'all' : Number(value))
          }}
          className={selectClass}
        >
          {pageSizeOptions.map((option) => (
            <option key={String(option)} value={option === 'all' ? 'all' : String(option)}>
              {option === 'all' ? 'All' : option}
            </option>
          ))}
        </select>
        <span className="text-slate-500">
          {start}–{end} of {total}
        </span>
      </label>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className={buttonClass}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Prev
        </button>
        <span className="text-xs text-slate-400">
          Page {Math.min(page, pageCount)} of {pageCount}
        </span>
        <button
          type="button"
          className={buttonClass}
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  )
}
