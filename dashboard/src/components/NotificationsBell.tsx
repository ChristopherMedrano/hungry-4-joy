import { useEffect, useRef, useState } from 'react'
import { Icon } from './Icon'

interface MockNotification {
  id: string
  title: string
  body: string
  tone: 'info' | 'warning' | 'success'
  when: string
  unread: boolean
}

// Mocked notification feed — not wired to the API yet.
const mockNotifications: MockNotification[] = [
  {
    id: 'crm-retry',
    title: 'CRM sync needs attention',
    body: '2 completed donations have HubSpot sync errors waiting for a manual retry.',
    tone: 'warning',
    when: '12m ago',
    unread: true,
  },
  {
    id: 'cart-sweep',
    title: 'Unfed Foxy transactions found',
    body: 'A sweep surfaced 1 cart with no linked checkout event. Reconcile when ready.',
    tone: 'info',
    when: '1h ago',
    unread: true,
  },
  {
    id: 'all-clear',
    title: 'Server analytics caught up',
    body: 'All recent checkout events emitted conversion analytics successfully.',
    tone: 'success',
    when: 'Yesterday',
    unread: false,
  },
]

const toneDot: Record<MockNotification['tone'], string> = {
  info: 'bg-sky-400',
  warning: 'bg-amber-400',
  success: 'bg-emerald-400',
}

export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const unreadCount = mockNotifications.filter((item) => item.unread).length

  useEffect(() => {
    if (!open) {
      return
    }

    function onPointerDown(event: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={`Notifications${unreadCount ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={open}
        className="relative rounded-md p-2 text-slate-300 transition hover:bg-slate-800 hover:text-slate-100"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-slate-900">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-slate-800 bg-slate-900 shadow-xl shadow-slate-950/60">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <p className="text-sm font-semibold text-white">Notifications</p>
            {unreadCount > 0 ? (
              <span className="rounded-full bg-rose-500/15 px-2 py-0.5 text-[10px] font-medium text-rose-300">
                {unreadCount} new
              </span>
            ) : null}
          </div>
          <ul className="max-h-96 divide-y divide-slate-800 overflow-y-auto">
            {mockNotifications.map((item) => (
              <li
                key={item.id}
                className={`flex gap-3 px-4 py-3 ${item.unread ? 'bg-slate-800/40' : ''}`}
              >
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[item.tone]}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-100">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{item.body}</p>
                  <p className="mt-1 text-[11px] text-slate-500">{item.when}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-slate-800 px-4 py-2.5">
            <p className="text-center text-[11px] text-slate-500">
              Notifications are mocked — wiring coming soon.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
