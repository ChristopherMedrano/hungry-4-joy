import type { SVGProps } from 'react'

export type IconName =
  | 'dashboard'
  | 'events'
  | 'cart-sync'
  | 'crm-sync'
  | 'analytics'
  | 'system-status'
  | 'bell'
  | 'close'
  | 'chevron-right'
  | 'check-circle'
  | 'alert'
  | 'sidebar'

const paths: Record<IconName, string[]> = {
  // Layout grid — dashboard home
  dashboard: [
    'M3 3h7v7H3z',
    'M14 3h7v7h-7z',
    'M14 14h7v7h-7z',
    'M3 14h7v7H3z',
  ],
  // Receipt — checkout events
  events: ['M4 3h16v18l-2.5-1.5L15 21l-2.5-1.5L10 21l-2.5-1.5L5 21V3z', 'M8 8h8', 'M8 12h8'],
  // Cart — cart sync issues
  'cart-sync': [
    'M3 4h2l2.4 12.4a1 1 0 0 0 1 .8h8.7a1 1 0 0 0 1-.8L21 8H6',
    'M10 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    'M18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  ],
  // Users — CRM sync issues
  'crm-sync': [
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2',
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'M22 21v-2a4 4 0 0 0-3-3.87',
    'M16 3.13a4 4 0 0 1 0 7.75',
  ],
  // Bar chart — server analytics
  analytics: ['M3 3v18h18', 'M7 16v-5', 'M12 16V8', 'M17 16v-9'],
  // Activity pulse — system status
  'system-status': ['M22 12h-4l-3 9L9 3l-3 9H2'],
  bell: [
    'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9',
    'M13.73 21a2 2 0 0 1-3.46 0',
  ],
  close: ['M18 6 6 18', 'M6 6l12 12'],
  'chevron-right': ['M9 18l6-6-6-6'],
  'check-circle': ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'],
  alert: ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
  // Panel-left — sidebar collapse toggle
  sidebar: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 3v18'],
}

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
}

export function Icon({ name, className, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...props}
    >
      {paths[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}
