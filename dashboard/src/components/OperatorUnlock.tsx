import { useState, type FormEvent } from 'react'

interface OperatorUnlockProps {
  unlocked: boolean
  onUnlock: (token: string) => void
  onLock: () => void
  error?: string | null
}

export function OperatorUnlock({ unlocked, onUnlock, onLock, error }: OperatorUnlockProps) {
  const [token, setToken] = useState('')
  const [open, setOpen] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (token.trim() === '') {
      return
    }

    onUnlock(token.trim())
    setToken('')
  }

  return (
    <section
      aria-label="Operator access"
      className="fixed bottom-4 right-4 z-40 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-slate-700 bg-slate-900/95 p-4 shadow-xl backdrop-blur"
    >
      {unlocked ? (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">Operator actions unlocked</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              Reconcile, sweep, and CRM retry are available until you lock or reload.
            </p>
          </div>
          <button
            type="button"
            onClick={onLock}
            className="shrink-0 rounded-md border border-slate-700 px-2.5 py-1.5 text-sm text-slate-300 hover:border-slate-600 hover:text-white"
          >
            Lock
          </button>
        </div>
      ) : open ? (
        <>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-sm font-semibold text-white">Operator access</h2>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-200"
            >
              Hide
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Live data is read-only. Enter the operator token to unlock reconcile, sweep, and CRM
            retry. The token stays in this page&apos;s memory.
          </p>
          <form className="mt-3 space-y-3" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-slate-300">
              Operator token
              <input
                type="password"
                autoComplete="off"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </label>
            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={token.trim() === ''}
                className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Unlock
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs leading-5 text-slate-400">Read-only. Unlock to run operator actions.</p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="shrink-0 rounded-md bg-teal-500 px-3 py-1.5 text-sm font-semibold text-slate-950"
          >
            Unlock
          </button>
        </div>
      )}
    </section>
  )
}
