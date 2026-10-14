import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { Account, Transaction } from '../types'
import { formatMoney } from './format'
import { ListIcon, SearchIcon, WalletIcon, HomeIcon, InfoIcon } from './icons'
import { Skeleton } from './ui'

interface Result {
  key: string
  group: 'Pages' | 'Accounts' | 'Transactions'
  title: string
  subtitle?: string
  to: string
  icon: typeof SearchIcon
}

const PAGES: Result[] = [
  { key: 'p-dash', group: 'Pages', title: 'Dashboard', subtitle: 'Balances and money movement', to: '/', icon: HomeIcon },
  { key: 'p-tx', group: 'Pages', title: 'Transactions', subtitle: 'Full history with filters', to: '/transactions', icon: ListIcon },
  { key: 'p-about', group: 'Pages', title: 'About', subtitle: 'What FinMind AI is', to: '/about', icon: InfoIcon },
  { key: 'p-privacy', group: 'Pages', title: 'Privacy and storage', subtitle: 'What this device stores', to: '/privacy', icon: InfoIcon },
]

const MAX_PER_GROUP = 5

/** Command-palette style search over pages, your accounts and your 50 most recent transactions. */
export default function SearchDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)
  const [failed, setFailed] = useState(false)

  // Load data each time the dialog opens so results are fresh.
  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    setFailed(false)
    inputRef.current?.focus()
    let cancelled = false
    Promise.all([api.listAccounts(), api.listTransactions({ page: 0, size: 50 })])
      .then(([a, t]) => {
        if (cancelled) return
        setAccounts(a)
        setTransactions(t.content)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [open])

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase()
    const match = (...fields: (string | null | undefined)[]) =>
      q === '' || fields.some((f) => f?.toLowerCase().includes(q))

    const pages = PAGES.filter((p) => match(p.title, p.subtitle)).slice(0, MAX_PER_GROUP)
    const accs: Result[] = (accounts ?? [])
      .filter((a) => match(a.name, a.currency))
      .slice(0, MAX_PER_GROUP)
      .map((a) => ({
        key: `a-${a.id}`,
        group: 'Accounts',
        title: a.name,
        subtitle: formatMoney(a.balance, a.currency),
        to: `/transactions?accountId=${a.id}`,
        icon: WalletIcon,
      }))
    const nameOf = (id: string) => accounts?.find((a) => a.id === id)?.name
    const txs: Result[] = q === '' ? [] : (transactions ?? [])
      .filter((t) => match(t.description, t.type, String(t.amount), ...t.entries.map((e) => nameOf(e.accountId))))
      .slice(0, MAX_PER_GROUP)
      .map((t) => ({
        key: `t-${t.id}`,
        group: 'Transactions',
        title: t.description || t.type.charAt(0) + t.type.slice(1).toLowerCase(),
        subtitle: `${formatMoney(t.amount, t.currency)} · ${new Date(t.createdAt).toLocaleDateString('en-IN')}`,
        to: `/transactions?accountId=${t.entries[0]?.accountId ?? ''}`,
        icon: ListIcon,
      }))
    return [...pages, ...accs, ...txs]
  }, [query, accounts, transactions])

  useEffect(() => setActive(0), [query])

  // Keep the highlighted row in view while arrowing through results.
  useEffect(() => {
    document.getElementById(`search-opt-${active}`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function go(r: Result) {
    onClose()
    navigate(r.to)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault()
      go(results[active])
    } else if (e.key === 'Tab') e.preventDefault() // keep focus in the field; arrows move through results
  }

  const loading = !failed && (accounts === null || transactions === null)
  let lastGroup = ''

  return (
    <div className="fade-in fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-3 pt-16 backdrop-blur-sm sm:pt-24"
         onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKeyDown}
           className="pop-in flex max-h-[70vh] w-full max-w-xl min-w-0 flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-line px-4">
          <SearchIcon className="shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, accounts, transactions"
            role="combobox"
            aria-expanded="true"
            aria-controls="search-results"
            aria-activedescendant={results[active] ? `search-opt-${active}` : undefined}
            className="min-w-0 flex-1 bg-transparent py-4 text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs text-muted sm:block">Esc</kbd>
        </div>

        <div id="search-results" role="listbox" className="overflow-y-auto overflow-x-hidden p-2">
          {loading && (
            <div className="space-y-2 p-2">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          )}
          {failed && (
            <p className="px-3 py-3 text-sm text-danger">
              Could not load your accounts and transactions, so only pages are searchable right now.
            </p>
          )}
          {results.map((r, i) => {
            const header = r.group !== lastGroup ? r.group : null
            lastGroup = r.group
            const Icon = r.icon
            return (
              <div key={r.key}>
                {header && <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted">{header}</p>}
                <button
                  id={`search-opt-${i}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r)}
                  className={`flex w-full min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    i === active ? 'bg-brand-soft text-brand' : 'hover:bg-surface-2'
                  }`}
                >
                  <Icon className="shrink-0" width={18} height={18} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{r.title}</span>
                    {r.subtitle && <span className="block truncate text-xs text-muted">{r.subtitle}</span>}
                  </span>
                </button>
              </div>
            )
          })}
          {!loading && results.length === 0 && (
            <p className="px-3 py-8 text-center text-sm text-muted">
              Nothing matches “{query}”. Try an account name, a description or an amount.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
