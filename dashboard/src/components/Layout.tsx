import type { ReactNode } from 'react'

const navItems = [
  { id: 'events', label: 'Checkout events', active: true },
  { id: 'retry', label: 'Retry history', active: false, disabled: true },
  { id: 'incidents', label: 'Incident notes', active: false, disabled: true },
]

interface LayoutProps {
  children: ReactNode
  previewControl?: ReactNode
}

export function Layout({ children, previewControl }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-col gap-4 px-3 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-400">
              Hungry-4-Joy
            </p>
            <h1 className="text-lg font-semibold text-white sm:text-xl">
              Integration status dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Practice support view for checkout events and CRM sync state.
            </p>
          </div>
          {previewControl}
        </div>
        <nav
          aria-label="Dashboard sections"
          className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 pb-3 lg:px-4"
        >
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={item.disabled}
              aria-current={item.active ? 'page' : undefined}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-medium transition ${
                item.active
                  ? 'bg-teal-500/15 text-teal-300 ring-1 ring-teal-500/40'
                  : item.disabled
                    ? 'cursor-not-allowed text-slate-600'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.label}
              {item.disabled ? ' (soon)' : ''}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] px-3 py-6 lg:px-4">{children}</main>
    </div>
  )
}
