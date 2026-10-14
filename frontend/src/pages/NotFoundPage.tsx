import { Link, useLocation } from 'react-router-dom'

export default function NotFoundPage() {
  const { pathname } = useLocation()
  return (
    <div className="grid min-h-[60vh] place-items-center px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-extrabold text-brand">404</p>
        <h1 className="mt-3 text-xl font-bold">We cannot find that page</h1>
        <p className="mt-2 break-all text-sm text-muted">
          <code className="rounded bg-surface-2 px-1.5 py-0.5">{pathname}</code> does not exist. The link may be
          out of date or mistyped.
        </p>
        <Link to="/" className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition hover:brightness-110">
          Back to dashboard
        </Link>
      </div>
    </div>
  )
}
