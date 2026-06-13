interface EmptyStateProps {
  onResetFilters?: () => void
  title?: string
  message?: string
}

export function EmptyState({
  onResetFilters,
  title = 'No checkout events match',
  message = 'Adjust filters or wait for new webhook events once the Laravel dashboard API is connected.',
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/30 px-6 py-16 text-center">
      <p className="text-base font-medium text-slate-200">{title}</p>
      <p className="mt-2 text-sm text-slate-400">{message}</p>
      {onResetFilters ? (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-6 rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700"
        >
          Reset filters
        </button>
      ) : null}
    </div>
  )
}
