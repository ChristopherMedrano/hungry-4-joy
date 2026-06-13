export type StatusCalloutTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'orange' | 'slate'

const styles: Record<StatusCalloutTone, string> = {
  sky: 'border-sky-500/30 bg-sky-500/10 text-sky-100',
  emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100',
  amber: 'border-amber-500/30 bg-amber-500/10 text-amber-100',
  rose: 'border-rose-500/30 bg-rose-500/10 text-rose-100',
  orange: 'border-orange-500/30 bg-orange-500/10 text-orange-100',
  slate: 'border-slate-600/40 bg-slate-800/40 text-slate-300',
}

interface StatusCalloutProps {
  title: string
  body: string
  tone: StatusCalloutTone
  code?: string | null
}

export function StatusCallout({ title, body, tone, code }: StatusCalloutProps) {
  return (
    <section className={`rounded-md border p-3 text-sm ${styles[tone]}`}>
      <p className="font-medium">{title}</p>
      <p className="mt-1 opacity-90">{body}</p>
      {code ? (
        <p className="mt-2 font-mono text-xs opacity-70">Code: {code}</p>
      ) : null}
    </section>
  )
}

export const sectionHeadingClass =
  'text-xs font-medium uppercase tracking-wide text-slate-400'
