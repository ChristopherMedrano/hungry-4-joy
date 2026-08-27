import { useRef, useState, type FormEvent } from 'react'
import { generateOperatorToken, TokenCopyGuard } from '../lib/operatorToken'

interface OperatorUnlockProps {
  onUnlock: (token: string) => void
  onTokenChange?: () => void
  error?: string | null
}

export function OperatorUnlock({ onUnlock, onTokenChange, error }: OperatorUnlockProps) {
  const [token, setToken] = useState('')
  const [tokenStatus, setTokenStatus] = useState<string | null>(null)
  const tokenRef = useRef('')
  const copyGuard = useRef(new TokenCopyGuard())

  function replaceToken(nextToken: string): void {
    copyGuard.current.invalidate()
    tokenRef.current = nextToken
    setToken(nextToken)
    onTokenChange?.()
  }

  function handleGenerate(): void {
    try {
      replaceToken(generateOperatorToken())
      setTokenStatus('New token generated. Copy it, configure Render, and deploy before unlocking.')
    } catch {
      setTokenStatus('Secure token generation is unavailable. Use a trusted local generator instead.')
    }
  }

  async function handleCopy(): Promise<void> {
    const copiedToken = tokenRef.current
    const result = await copyGuard.current.copy(copiedToken, () => tokenRef.current)

    if (result === 'copied') {
      setTokenStatus('Token copied to the clipboard.')
    } else if (result === 'failed') {
      setTokenStatus('Copy failed. The token remains in the field; copy it manually.')
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (token.trim() === '') {
      return
    }

    onUnlock(token.trim())
    replaceToken('')
  }

  return (
    <div className="mx-auto max-w-lg rounded-lg border border-slate-700 bg-slate-900/70 p-6 shadow-xl">
      <h1 className="text-xl font-semibold text-white">Operator access</h1>
      <p className="mt-2 text-sm leading-6 text-slate-400">
        Live support data and actions require the portfolio demo operator token. The token stays
        in this page's memory and is cleared when you lock or reload the dashboard.
      </p>
      <p className="mt-2 text-sm leading-6 text-amber-200/90">
        A generated token works only after the identical value is configured as{' '}
        <code>DASHBOARD_OPERATOR_TOKEN</code> on the Render middleware and that service is
        deployed.
      </p>
      <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-slate-300">
          Operator token
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(event) => {
              replaceToken(event.target.value)
              setTokenStatus(null)
            }}
            className="mt-2 block w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            className="rounded-md border border-teal-500/50 px-3 py-2 text-sm font-medium text-teal-200 hover:border-teal-400 hover:text-white"
          >
            Generate secure token
          </button>
          <button
            type="button"
            disabled={token === ''}
            onClick={() => void handleCopy()}
            className="rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            Copy token
          </button>
        </div>
        {tokenStatus ? (
          <p className="text-sm text-slate-300" role="status" aria-live="polite">
            {tokenStatus}
          </p>
        ) : null}
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
