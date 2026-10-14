import { Link, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import Footer from './Footer'
import { BrandMark } from './Icon'
import ThemeToggle from './ThemeToggle'

/** Layout for pages that do not need a signed-in user: About, Privacy and the not-found page. */
export default function PublicShell() {
  const { user } = useAuth()
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 text-lg font-extrabold tracking-tight">
            <BrandMark />
            FinMind AI
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to={user ? '/' : '/login'}
              className="rounded-xl border border-line px-4 py-2 text-sm font-semibold transition hover:border-brand/50 hover:bg-surface-2"
            >
              {user ? 'Open dashboard' : 'Sign in'}
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl min-w-0 flex-1 px-4 py-10 sm:px-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
