import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import type { Account } from '../types'
import { useAuth } from '../features/auth/AuthContext'
import { useTheme } from '../theme/ThemeContext'
import Icon, { type IconName } from './Icon'

interface Item {
  id: string
  group: 'Pages' | 'Accounts' | 'Actions'
  label: string
  hint?: string
  icon: IconName
  run: () => void
}

/**
 * Site search. Opens with Ctrl/Cmd+K or the search button, and finds pages, your accounts and quick actions.
 * Keyboard: type to filter, arrow keys to move, Enter to open, Esc to close.
 */
export default function SearchPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { theme, toggle } = useTheme()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [accounts, setAccounts] = useState<Account[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    inputRef.current?.focus()
    api.listAccounts().then(setAccounts).catch(() => setAccounts([]))
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const items = useMemo<Item[]>(() => {
    const go = (to: string) => () => {
      navigate(to)
      onClose()
    }
    const list: Item[] = [
      { id: 'p-dash', group: 'Pages', label: 'Dashboard', hint: 'Balances and cash flow', icon: 'dashboard', run: go('/') },
      { id: 'p-tx', group: 'Pages', label: 'Transactions', hint: 'Full history with filters', icon: 'transactions', run: go('/transactions') },
      { id: 'p-about', group: 'Pages', label: 'About FinMind', icon: 'info', run: go('/about') },
      { id: 'p-priv', group: 'Pages', label: 'Privacy', icon: 'shield', run: go('/privacy') },
      ...accounts.map<Item>((a) => ({
        id: `a-${a.id}`,
        group: 'Accounts',
        label: a.name,
        hint: `${a.currency} account, show its transactions`,
        icon: 'wallet',
        run: go(`/transactions?account=${a.id}`),
      })),
      {
        id: 'x-theme',
        group: 'Actions',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        icon: theme === 'dark' ? 'sun' : 'moon',
        run: () => {
          toggle()
          onClose()
        },
      },
      {
        id: 'x-out',
        group: 'Actions',
        label: 'Log out',
        icon: 'logout',
        run: () => {
          onClose()
          logout()
        },
      },
    ]
    const q = query.trim().toLowerCase()
    return q ? list.filter((i) => `${i.label} ${i.hint ?? ''}`.toLowerCase().includes(q)) : list
  }, [accounts, query, theme, toggle, navigate, onClose, logout])

  useEffect(() => setActive(0), [query])

  if (!open) return null

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[active]?.run()
    }
  }

  let lastGroup = ''
  return (
    <div className="anim-fade fixed inset-0 z-[60] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search"
        onKeyDown={onKeyDown}
        onMouseDown={(e) => e.stopPropagation()}
        className="anim-pop w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Icon name="search" className="h-5 w-5 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, accounts, actions"
            aria-label="Search"
            className="h-12 w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 text-xs text-muted sm:block">Esc</kbd>
        </div>
        <ul role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches "{query}". Try a page or account name.</li>
          )}
          {items.map((item, i) => {
            const showGroup = item.group !== lastGroup
            lastGroup = item.group
            return (
              <li key={item.id} role="presentation">
                {showGroup && <p className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{item.group}</p>}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={item.run}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${i === active ? 'bg-brand-soft text-brand-text' : 'hover:bg-surface-2'}`}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="hidden min-w-0 truncate text-xs text-muted sm:block">{item.hint}</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
