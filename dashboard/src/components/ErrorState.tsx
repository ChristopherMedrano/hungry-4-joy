interface ErrorStateProps {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-6 py-12 text-center"
    >
      <p className="text-base font-medium text-rose-100">Could not load dashboard data</p>
      <p className="mt-2 text-sm text-rose-200/90">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-6 rounded-md bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500"
        >
          Try again
        </button>
      ) : null}
    </div>
  )
}
