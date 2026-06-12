export function LoadingState() {
  return (
    <div
      aria-live="polite"
      aria-busy="true"
      className="rounded-lg border border-slate-800 bg-slate-900/40 px-6 py-16 text-center"
    >
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-teal-400" />
      <p className="mt-4 text-sm font-medium text-slate-300">Loading checkout events…</p>
      <p className="mt-1 text-xs text-slate-500">
        Shell preview state — API wiring comes in a later issue.
      </p>
    </div>
  )
}
