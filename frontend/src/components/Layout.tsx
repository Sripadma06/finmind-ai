import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import Footer from './Footer'
import Icon, { BrandMark, type IconName } from './Icon'
import SearchPalette from './SearchPalette'
import ThemeToggle from './ThemeToggle'

const nav: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Dashboard', icon: 'dashboard', end: true },
  { to: '/transactions', label: 'Transactions', icon: 'transactions' },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
      <BrandMark />
      FinMind AI
    </Link>
  )
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {nav.map((n) => (
        <NavLink
          key={n.to}
          to={n.to}
          end={n.end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive ? 'bg-brand-soft text-brand-text' : 'text-muted hover:bg-surface-2 hover:text-fg'
            }`
          }
        >
          <Icon name={n.icon} />
          {n.label}
        </NavLink>
      ))}
    </nav>
  )
}

function UserBox() {
  const { user, logout } = useAuth()
  const initials = (user?.name ?? '?').split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line p-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-brand-fg">{initials}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{user?.name}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Log out"
        title="Log out"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-surface-2 hover:text-expense"
      >
        <Icon name="logout" className="h-4 w-4" />
      </button>
    </div>
  )
}

function MobileDrawer({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="anim-fade absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="anim-drawer absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col gap-6 border-r border-line bg-surface p-4"
      >
        <div className="flex items-center justify-between">
          <Brand />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="grid h-10 w-10 place-items-center rounded-xl text-muted transition hover:bg-surface-2 hover:text-fg"
          >
            <Icon name="close" />
          </button>
        </div>
        <NavList onNavigate={onClose} />
        <div className="mt-auto">
          <UserBox />
        </div>
      </aside>
    </div>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => setMenuOpen(false), [pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-6 border-r border-line bg-surface/60 p-4 backdrop-blur lg:flex">
        <Brand />
        <NavList />
        <div className="mt-auto">
          <UserBox />
        </div>
      </aside>

      <div className="flex min-h-dvh min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-bg/80 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label="Open menu"
              className="grid h-10 w-10 place-items-center rounded-xl border border-line text-muted transition hover:border-brand/50 hover:bg-surface-2 hover:text-fg active:scale-95 lg:hidden"
            >
              <Icon name="menu" />
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-left text-sm text-muted transition hover:border-brand/50 hover:text-fg sm:max-w-md"
            >
              <Icon name="search" className="h-4 w-4" />
              <span className="min-w-0 flex-1 truncate">Search</span>
              <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs sm:block">Ctrl K</kbd>
            </button>
            <div className="ml-auto" />
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl min-w-0 flex-1 space-y-6 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
        <Footer />
      </div>

      {menuOpen && <MobileDrawer onClose={() => setMenuOpen(false)} />}
      <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  )
}
