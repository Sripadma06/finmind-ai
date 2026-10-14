import type { ReactNode, SVGProps } from 'react'

function Icon({ children, ...props }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

type P = SVGProps<SVGSVGElement>

export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
)
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Icon>
)
export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4-4" />
  </Icon>
)
export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" />
  </Icon>
)
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />
  </Icon>
)
export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z" />
  </Icon>
)
export const ListIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
  </Icon>
)
export const ArrowUpIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Icon>
)
export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18h.01" />
  </Icon>
)
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Icon>
)
export const WalletIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7a2 2 0 012-2h11v3" />
    <path d="M4 7v10a2 2 0 002 2h13a1 1 0 001-1V9a1 1 0 00-1-1H6a2 2 0 01-2-1z" />
    <path d="M16 13.5h.01" />
  </Icon>
)
export const LogoutIcon = (p: P) => (
  <Icon {...p}>
    <path d="M10 5H6a1 1 0 00-1 1v12a1 1 0 001 1h4M15 8l4 4-4 4M19 12H9" />
  </Icon>
)
export const InfoIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
)
export const ArrowRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)
export const WifiOffIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 3l18 18M8.5 16a5 5 0 017 0M5 12.5a10 10 0 015-2.7M12 20h.01M19 12.5a10 10 0 00-4-2.4" />
  </Icon>
)

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-extrabold tracking-tight ${className}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-brand-fg">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
             strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 18V8l8 6 8-6v10" />
        </svg>
      </span>
      FinMind
    </span>
  )
}
