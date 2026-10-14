import { Link } from 'react-router-dom'

export function AboutPage() {
  return (
    <article className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">About FinMind AI</h1>
      <p className="text-muted">
        FinMind AI is a practice finance app. You can create accounts, deposit, withdraw and transfer between your own
        accounts, and review your history. All of it is simulated: no bank is connected and no real money moves.
      </p>
      <h2 className="pt-2 text-xl font-bold">How money moves</h2>
      <p className="text-muted">
        Every transfer is recorded as a matching debit and credit that save together or not at all. Retrying a request
        never moves money twice, and balances can never go below zero.
      </p>
      <h2 className="pt-2 text-xl font-bold">Built with</h2>
      <p className="text-muted">Java and Spring Boot, PostgreSQL, and React with TypeScript.</p>
      <p>
        <Link to="/" className="font-semibold text-brand-text hover:underline">Go to your dashboard</Link>
      </p>
    </article>
  )
}

export function PrivacyPage() {
  return (
    <article className="space-y-5">
      <h1 className="text-3xl font-extrabold tracking-tight">Privacy</h1>
      <p className="text-muted">What FinMind AI keeps, and where.</p>
      <h2 className="pt-2 text-xl font-bold">In your browser</h2>
      <ul className="list-disc space-y-1 pl-5 text-muted">
        <li>Your sign-in token, so you stay signed in.</li>
        <li>Your theme choice (light or dark).</li>
        <li>Whether you dismissed the storage notice.</li>
      </ul>
      <p className="text-muted">This is browser local storage, not tracking cookies. You can clear it any time by logging out or clearing site data.</p>
      <h2 className="pt-2 text-xl font-bold">On the server</h2>
      <p className="text-muted">
        Your name, email, password (stored only as a one-way hash), accounts and transactions. The server also keeps an
        audit log of actions such as logins and transfers. It does not store amounts or personal details.
      </p>
      <h2 className="pt-2 text-xl font-bold">What we don't do</h2>
      <p className="text-muted">No ads, no analytics, no third-party trackers, and fonts are served from this app itself.</p>
    </article>
  )
}

export function NotFoundPage() {
  return (
    <div className="py-16 text-center">
      <p className="text-5xl font-extrabold text-brand-text">404</p>
      <h1 className="mt-3 text-2xl font-bold">That page doesn't exist</h1>
      <p className="mx-auto mt-2 max-w-sm text-muted">The link may be mistyped or the page may have moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-brand-fg transition hover:brightness-110">
        Back to dashboard
      </Link>
    </div>
  )
}
