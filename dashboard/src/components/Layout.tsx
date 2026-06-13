import type { ReactNode } from 'react'
import type { DashboardSection } from '../lib/dashboardSections'
import { dashboardSections } from '../lib/dashboardSections'

interface LayoutProps {
  children: ReactNode
  previewControl?: ReactNode
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}

export function Layout({
  children,
  previewControl,
  activeSection,
  onSectionChange,
}: LayoutProps) {
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
          className="mx-auto flex max-w-[1600px] gap-1 overflow-x-auto px-3 pb-3 pt-1 lg:px-4"
        >
          {dashboardSections.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={activeSection === item.id ? 'page' : undefined}
              onClick={() => onSectionChange(item.id)}
              className={`shrink-0 rounded-md border px-3 py-2 text-sm font-medium transition ${
                activeSection === item.id
                  ? 'border-teal-500/40 bg-teal-500/15 text-teal-300'
                  : 'border-transparent text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-[1600px] px-3 py-6 lg:px-4">{children}</main>
    </div>
  )
}
