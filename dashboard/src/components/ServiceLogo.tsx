import type { ServiceKey } from '../types/health'

interface ServiceLogoProps {
  service: ServiceKey
  className?: string
}

export function ServiceLogo({ service, className = 'h-8 w-8' }: ServiceLogoProps) {
  switch (service) {
    case 'wordpress':
      return (
        <svg
          viewBox="0 0 32 32"
          className={className}
          aria-hidden
          role="img"
        >
          <circle cx="16" cy="16" r="15" fill="#21759B" />
          <path
            fill="#fff"
            d="M5.5 16c0 4.8 3.1 8.9 7.4 10.3L6.8 12.4A10.4 10.4 0 0 0 5.5 16zm20.6 1.2c-.2-1.1-.8-2-1.5-2.6-.9-.8-1.8-1.2-1.8-2.3 0-1.2.7-2 1.7-2 1 0 1.6.6 2 1.1l1.4-1.3c-.9-1-2-1.6-3.4-1.6-2 0-3.4 1.2-3.4 3 0 1.4.9 2.2 1.7 2.9.8.7 1.1 1.1 1.1 1.8 0 .9-.5 1.4-1.3 1.4-.9 0-1.5-.4-2-1.1l-1.4 1.3c.8 1.1 2 1.8 3.4 1.8 2.2 0 3.6-1.3 3.6-3.3.1-1.1-.3-1.9-.7-2.5zM16 6.2c2.2 0 4.2.8 5.7 2.1l-2.5 7.2c-.9-2.9-1.9-5.9-1.9-5.9s-.9 3-1.9 5.9L12.3 8.3c1.5-1.3 3.5-2.1 5.7-2.1z"
          />
        </svg>
      )
    case 'hubspot':
      return (
        <svg
          viewBox="0 0 32 32"
          className={className}
          aria-hidden
          role="img"
        >
          <circle cx="16" cy="16" r="15" fill="#FF7A59" />
          <circle cx="11" cy="16" r="2.5" fill="#fff" />
          <circle cx="21" cy="11" r="2" fill="#fff" />
          <circle cx="21" cy="21" r="2" fill="#fff" />
          <path stroke="#fff" strokeWidth="1.8" d="M13 16h4M19 13v6" />
        </svg>
      )
    case 'foxy':
      return (
        <svg
          viewBox="0 0 32 32"
          className={className}
          aria-hidden
          role="img"
        >
          <rect x="1" y="1" width="30" height="30" rx="8" fill="#F97316" />
          <path
            fill="#fff"
            d="M9 22V10h4.2c2.4 0 3.9 1.2 3.9 3.1 0 1.3-.7 2.3-1.8 2.8L19 22h-3.2l-2.5-5.4H12.2V22H9zm3.2-8.2h1c1 0 1.5-.4 1.5-1.2 0-.8-.5-1.2-1.5-1.2h-1v2.4zM20.2 22l3.6-12h3.3l-3.6 12h-3.3z"
          />
        </svg>
      )
    case 'laravel':
      return (
        <svg
          viewBox="0 0 32 32"
          className={className}
          aria-hidden
          role="img"
        >
          <rect x="1" y="1" width="30" height="30" rx="8" fill="#EF4444" />
          <path
            fill="#fff"
            d="M8 22L16 8l8 14h-3.4l-1.4-2.4H12.8L11.4 22H8zm5.2-5.2h5.6L16 12.4l-2.8 4.4z"
          />
        </svg>
      )
  }
}
