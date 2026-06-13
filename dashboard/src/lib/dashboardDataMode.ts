import type { DashboardDataMode } from '../types/dashboard'

export const HOSTED_MIDDLEWARE_URL =
  import.meta.env.VITE_MIDDLEWARE_API_URL ?? 'https://hungry-4-joy-middleware.onrender.com'

export function isLocalDashboardHost(): boolean {
  const host = window.location.hostname

  return host === 'localhost' || host === '127.0.0.1'
}

export function apiBaseForMode(mode: DashboardDataMode): string {
  if (mode === 'hosted-api' && isLocalDashboardHost()) {
    if (import.meta.env.VITE_USE_LOCAL_PROXY_HOSTED === '1') {
      return ''
    }

    return HOSTED_MIDDLEWARE_URL
  }

  return ''
}

export function isApiDataMode(mode: DashboardDataMode): boolean {
  return mode === 'hosted-api' || mode === 'local-api'
}

export function viewModeOptions(): { value: DashboardDataMode; label: string }[] {
  const options: { value: DashboardDataMode; label: string }[] = [
    {
      value: 'hosted-api',
      label: isLocalDashboardHost() ? 'Hosted API (Render)' : 'Live API',
    },
  ]

  if (isLocalDashboardHost()) {
    options.push({
      value: 'local-api',
      label: 'Local API (demo fixtures)',
    })
  }

  options.push({ value: 'seeded', label: 'Seeded preview' })

  if (import.meta.env.DEV) {
    options.push(
      { value: 'loading', label: 'Loading preview' },
      { value: 'empty', label: 'Empty preview' },
      { value: 'error', label: 'Error preview' },
    )
  }

  return options
}
