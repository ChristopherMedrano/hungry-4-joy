import { useState, type ReactNode } from 'react'
import type { DashboardSection, DashboardSectionConfig } from '../lib/dashboardSections'
import { dashboardSections } from '../lib/dashboardSections'
import { Icon } from './Icon'
import { NotificationsBell } from './NotificationsBell'

const SIDEBAR_STORAGE_KEY = 'h4j:sidebar-collapsed'

interface LayoutProps {
  children: ReactNode
  previewControl?: ReactNode
  systemStatusBar?: ReactNode
  activeSection: DashboardSection
  onSectionChange: (section: DashboardSection) => void
}

function NavButton({
  item,
  active,
  collapsed,
  onSelect,
}: {
  item: DashboardSectionConfig
  active: boolean
  collapsed: boolean
  onSelect: (section: DashboardSection) => void
}) {
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      aria-label={collapsed ? item.label : undefined}
      title={collapsed ? item.label : undefined}
      onClick={() => onSelect(item.id)}
      className={`flex w-full items-center gap-3 rounded-md py-2 text-sm font-medium transition ${
        collapsed ? 'justify-center px-2' : 'px-3'
      } ${
        active
          ? 'bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-500/30'
          : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
      }`}
    >
      <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </button>
  )
}

export function Layout({
  children,
  previewControl,
  systemStatusBar,
  activeSection,
  onSectionChange,
}: LayoutProps) {
  const primary = dashboardSections.filter((item) => item.group === 'primary')
  const secondary = dashboardSections.filter((item) => item.group === 'secondary')

  const [collapsed, setCollapsed] = useState<boolean>(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1',
  )

  function toggleCollapsed(): void {
    setCollapsed((value) => {
      const next = !value
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0')
      return next
    })
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900/90 backdrop-blur">
        <div className="flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-baseline gap-2">
            <span className="text-base font-bold text-teal-400">Hungry-4-Joy</span>
            <span className="text-slate-600">|</span>
            <span className="text-base font-semibold text-white">Dashboard</span>
          </div>

          <div className="flex items-center gap-3">
            {systemStatusBar ? (
              <>
                <div className="hidden md:block">{systemStatusBar}</div>
                <span className="hidden h-6 w-px bg-slate-700 md:block" aria-hidden />
              </>
            ) : null}
            {previewControl}
            <span className="h-6 w-px bg-slate-700" aria-hidden />
            <NotificationsBell />
          </div>
        </div>
      </header>

      {/* Mobile section nav */}
      <nav
        aria-label="Sections"
        className="flex gap-1 overflow-x-auto border-b border-slate-800 bg-slate-900/40 px-3 py-2 sm:hidden"
      >
        {dashboardSections.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={activeSection === item.id ? 'page' : undefined}
            onClick={() => onSectionChange(item.id)}
            className={`flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeSection === item.id
                ? 'bg-teal-500/15 text-teal-300'
                : 'text-slate-400 hover:bg-slate-800/70'
            }`}
          >
            <Icon name={item.icon} className="h-[18px] w-[18px]" />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="flex">
        <aside
          className={`sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 flex-col gap-1 overflow-y-auto border-r border-slate-800 bg-slate-900/40 p-3 transition-[width] duration-200 sm:flex ${
            collapsed ? 'w-16' : 'w-56'
          }`}
        >
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`mb-1 flex w-full items-center rounded-md py-2 text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200 ${
              collapsed ? 'justify-center px-2' : 'justify-end px-3'
            }`}
          >
            <Icon name="sidebar" className="h-[18px] w-[18px]" />
          </button>
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {primary.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeSection === item.id}
                collapsed={collapsed}
                onSelect={onSectionChange}
              />
            ))}
          </nav>
          <div className="my-2 border-t border-slate-800" />
          <nav aria-label="Secondary" className="flex flex-col gap-1">
            {secondary.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                active={activeSection === item.id}
                collapsed={collapsed}
                onSelect={onSectionChange}
              />
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
          <div className="mx-auto max-w-[1600px]">{children}</div>
        </main>
      </div>
    </div>
  )
}
