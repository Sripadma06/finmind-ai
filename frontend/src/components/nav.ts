import type { ComponentType, SVGProps } from 'react'
import { HomeIcon, ListIcon } from './icons'

export interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  end?: boolean
}

/** Main navigation. Every `to` here must exist as a route in App.tsx (scripts/check-links.mjs enforces it). */
export const NAV: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: HomeIcon, end: true },
  { to: '/transactions', label: 'Transactions', icon: ListIcon },
]

export const API_DOCS_URL = `${import.meta.env.VITE_API_BASE_URL ?? ''}/swagger-ui.html`
