import type { CheckoutEventSummary } from '../types/dashboard'
import type { HealthReadyResponse } from '../types/health'
import type { DashboardSection } from '../lib/dashboardSections'
import { formatShortDateTime } from '../lib/formatDate'
import { CrmStatusBadge } from './CrmStatusBadge'
import { Icon, type IconName } from './Icon'
import { TransactionStatusBadge } from './TransactionStatusBadge'

interface DashboardHomeProps {
  isPreview: boolean
  health: HealthReadyResponse | null
  events: CheckoutEventSummary[]
  totalEvents: number
  donationsCaptured: number
  syncedCount: number
  crmSyncIssuesCount: number
  cartSyncIssuesCount: number
  onNavigate: (section: DashboardSection) => void
  onViewEvent: (id: number) => void
}

interface MetricCardProps {
  icon: IconName
  label: string
  value: string
  hint: string
  hintTone?: 'muted' | 'positive' | 'negative'
  onClick?: () => void
}

const hintToneClass: Record<NonNullable<MetricCardProps['hintTone']>, string> = {
  muted: 'text-slate-500',
  positive: 'text-emerald-400',
  negative: 'text-rose-400',
}

function MetricCard({ icon, label, value, hint, hintTone = 'muted', onClick }: MetricCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left transition enabled:hover:border-slate-700 enabled:hover:bg-slate-900/80 disabled:cursor-default"
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300">
          <Icon name={icon} className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-slate-300">{label}</span>
      </div>
      <p className="text-3xl font-semibold text-white">{value}</p>
      <p className={`text-xs ${hintToneClass[hintTone]}`}>{hint}</p>
    </button>
  )
}

export function DashboardHome({
  isPreview,
  health,
  events,
  totalEvents,
  donationsCaptured,
  syncedCount,
  crmSyncIssuesCount,
  cartSyncIssuesCount,
  onNavigate,
  onViewEvent,
}: DashboardHomeProps) {
  const amountRaised = events
    .filter((event) => event.transaction_status === 'completed')
    .reduce((sum, event) => sum + event.donation.amount, 0)
  const currency = events[0]?.donation.currency ?? 'USD'

  const attentionItems = [
    crmSyncIssuesCount > 0
      ? {
          key: 'crm',
          label: `${crmSyncIssuesCount} CRM sync ${crmSyncIssuesCount === 1 ? 'issue' : 'issues'}`,
          body: 'Completed donations whose HubSpot sync needs a manual retry.',
          section: 'crm-sync-issues' as DashboardSection,
        }
      : null,
    cartSyncIssuesCount > 0
      ? {
          key: 'cart',
          label: `${cartSyncIssuesCount} cart sync ${cartSyncIssuesCount === 1 ? 'issue' : 'issues'}`,
          body: 'Click-time handoffs with no linked checkout event yet.',
          section: 'checkout-attempts' as DashboardSection,
        }
      : null,
    health && health.status !== 'ok'
      ? {
          key: 'health',
          label: `System status: ${health.status}`,
          body: 'One or more integrations are reporting a degraded state.',
          section: 'system-status' as DashboardSection,
        }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)

  const recentEvents = events.slice(0, 6)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon="check-circle"
          label="Donations captured"
          value={String(donationsCaptured)}
          hint={`$${amountRaised.toFixed(2)} ${currency} raised`}
          hintTone="positive"
          onClick={() => onNavigate('events')}
        />
        <MetricCard
          icon="crm-sync"
          label="CRM synced"
          value={totalEvents > 0 ? `${syncedCount} / ${totalEvents}` : String(syncedCount)}
          hint="Donors synced to HubSpot"
          onClick={() => onNavigate('events')}
        />
        <MetricCard
          icon="alert"
          label="CRM sync issues"
          value={String(crmSyncIssuesCount)}
          hint={crmSyncIssuesCount > 0 ? 'Needs manual retry' : 'All clear'}
          hintTone={crmSyncIssuesCount > 0 ? 'negative' : 'positive'}
          onClick={() => onNavigate('crm-sync-issues')}
        />
        <MetricCard
          icon="cart-sync"
          label="Cart sync issues"
          value={String(cartSyncIssuesCount)}
          hint={cartSyncIssuesCount > 0 ? 'Unlinked handoffs' : 'All clear'}
          hintTone={cartSyncIssuesCount > 0 ? 'negative' : 'positive'}
          onClick={() => onNavigate('checkout-attempts')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <h2 className="text-sm font-semibold text-white">Items need your attention</h2>
          <div className="mt-4">
            {attentionItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-10 text-center">
                <Icon name="check-circle" className="h-9 w-9 text-emerald-400" />
                <p className="text-base font-semibold text-emerald-200">
                  All systems running smoothly
                </p>
                <p className="text-sm text-slate-400">
                  No pending sync issues. Everything is operating normally.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {attentionItems.map((item) => (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.section)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-left transition hover:border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <div>
                        <p className="text-sm font-medium text-amber-100">{item.label}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{item.body}</p>
                      </div>
                      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-slate-500" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Activity feed</h2>
            <span className="text-xs text-slate-500">Recent events</span>
          </div>
          <div className="mt-4">
            {recentEvents.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">
                No recent checkout activity.
              </p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recentEvents.map((event) => (
                  <li key={event.checkout_event_id}>
                    <button
                      type="button"
                      onClick={() => onViewEvent(event.checkout_event_id)}
                      className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-80"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-100">
                          {event.donor.display_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {event.campaign.campaign_name} · ${event.donation.amount.toFixed(2)}{' '}
                          {event.donation.currency}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <TransactionStatusBadge status={event.transaction_status} />
                        <CrmStatusBadge summary={event.crm_status_summary} />
                        <span className="hidden text-xs text-slate-500 md:inline">
                          {formatShortDateTime(event.event_created_at)}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {isPreview ? (
        <p className="text-xs text-slate-500">
          Preview metrics are derived from seeded fixture rows. Switch view mode to hosted or local
          API for live data.
        </p>
      ) : null}
    </div>
  )
}
