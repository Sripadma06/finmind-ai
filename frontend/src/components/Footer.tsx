import { Link } from 'react-router-dom'
import Icon, { BrandMark } from './Icon'

// Served by the backend (proxied by Vite in development). Override for production deployments.
const API_DOCS_URL = import.meta.env.VITE_API_DOCS_URL ?? '/swagger-ui.html'

const linkClass = 'text-sm text-muted transition hover:text-fg hover:underline underline-offset-4'

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-bold">
            <BrandMark className="h-7 w-7" />
            FinMind AI
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted">
            A practice finance app. Every account and transaction is simulated, and no real money moves.
          </p>
        </div>
        <nav aria-label="App" className="flex flex-col gap-2">
          <p className="text-sm font-semibold">App</p>
          <Link to="/" className={linkClass}>Dashboard</Link>
          <Link to="/transactions" className={linkClass}>Transactions</Link>
        </nav>
        <nav aria-label="About" className="flex flex-col gap-2">
          <p className="text-sm font-semibold">About</p>
          <Link to="/about" className={linkClass}>About FinMind</Link>
          <Link to="/privacy" className={linkClass}>Privacy</Link>
          <a href={API_DOCS_URL} target="_blank" rel="noopener noreferrer" className={`${linkClass} inline-flex items-center gap-1`}>
            API docs
            <Icon name="external" className="h-3.5 w-3.5" />
          </a>
        </nav>
      </div>
    </footer>
  )
}
