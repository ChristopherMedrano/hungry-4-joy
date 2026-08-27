import { useState, type FormEvent } from 'react'

interface OperatorUnlockProps {
  onUnlock: (token: string) => void
  error?: string | null
}

export function OperatorUnlock({ onUnlock, error }: OperatorUnlockProps) {
  const [token, setToken] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (token.trim() === '') {
      return
    }

    onUnlock(token.trim())
    setToken('')
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-700 bg-slate-900/70 p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-white">Operator access</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Live support data and actions require the portfolio demo operator token. The token stays
        in this page's memory and is cleared when you lock or reload the dashboard.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
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
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">Use Seeded view for a credential-free preview.</p>
          <button
            type="submit"
            disabled={token.trim() === ''}
            className="rounded-md bg-teal-500 px-4 py-2 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Unlock
          </button>
        </div>
      </form>
    </div>
  )
}
