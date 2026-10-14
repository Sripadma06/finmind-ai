import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import CashFlowChart, { CHART_DAYS, lastDays, totals } from '../components/CashFlowChart'
import { formatMoney } from '../components/format'
import Icon from '../components/Icon'
import TxItem from '../components/TxItem'
import { Button, Card, EmptyState, ErrorMessage, ErrorState, Field, Select, Skeleton, SuccessMessage } from '../components/ui'
import { api, ApiError } from '../services/api'
import type { Account, Transaction } from '../types'

type OpKind = 'deposit' | 'withdraw' | 'transfer'

function describe(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

/* ---------- create account ---------- */

function CreateAccountForm({ onCreated }: { onCreated: () => void }) {
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api.createAccount(name.trim(), currency)
      setName('')
      onCreated()
    } catch (err) {
      setError(describe(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[1fr_7rem_auto] sm:items-end">
      <Field label="New account name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} placeholder="Salary, Savings…" />
      <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
        <option>INR</option>
        <option>USD</option>
        <option>EUR</option>
      </Select>
      <Button type="submit" loading={busy} disabled={!name.trim()}>
        Create account
      </Button>
      <div className="sm:col-span-3">
        <ErrorMessage message={error} />
      </div>
    </form>
  )
}

/* ---------- move money ---------- */

function OperationsForm({ accounts, onDone }: { accounts: Account[]; onDone: () => void }) {
  const [kind, setKind] = useState<OpKind>('deposit')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '')
  const [toId, setToId] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const [key, setKey] = useState(() => crypto.randomUUID())
  useEffect(() => {
    setKey(crypto.randomUUID())
  }, [kind, accountId, toId, amount, description])

  useEffect(() => {
    if (!accounts.some((a) => a.id === accountId)) setAccountId(accounts[0]?.id ?? '')
  }, [accounts, accountId])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (kind === 'deposit') await api.deposit(accountId, amount, description, key)
      else if (kind === 'withdraw') await api.withdraw(accountId, amount, description, key)
      else await api.transfer(accountId, toId, amount, description, key)
      const verb = kind === 'deposit' ? 'Deposited' : kind === 'withdraw' ? 'Withdrew' : 'Transferred'
      setMessage({ ok: true, text: `${verb} ${amount}.` })
      setAmount('')
      setDescription('')
      onDone()
    } catch (err) {
      setMessage({ ok: false, text: describe(err) })
    } finally {
      setBusy(false)
    }
  }

  const tab = (k: OpKind, label: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={kind === k}
      onClick={() => setKind(k)}
      className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${kind === k ? 'bg-brand text-brand-fg shadow' : 'text-muted hover:bg-surface hover:text-fg'}`}
    >
      {label}
    </button>
  )

  const destinations = accounts.filter((a) => a.id !== accountId)
  const submitLabel = kind === 'deposit' ? 'Deposit' : kind === 'withdraw' ? 'Withdraw' : 'Transfer'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div role="tablist" aria-label="Type of operation" className="flex gap-1 rounded-xl bg-surface-2 p-1">
        {tab('deposit', 'Deposit')}
        {tab('withdraw', 'Withdraw')}
        {tab('transfer', 'Transfer')}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label={kind === 'transfer' ? 'From account' : 'Account'} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </Select>
        {kind === 'transfer' && (
          <Select label="To account" value={toId} onChange={(e) => setToId(e.target.value)} required>
            <option value="">Select an account</option>
            {destinations.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </Select>
        )}
        <Field label="Amount" type="number" inputMode="decimal" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        <Field label="Note (optional)" value={description} maxLength={255} onChange={(e) => setDescription(e.target.value)} />
      </div>
      {message && (message.ok ? <SuccessMessage message={message.text} /> : <ErrorMessage message={message.text} />)}
      <Button type="submit" loading={busy} disabled={!accountId || (kind === 'transfer' && !toId)} className="w-full sm:w-auto">
        {submitLabel}
      </Button>
    </form>
  )
}

/* ---------- summary tiles ---------- */

function Stat({ label, value, tone = '', hint }: { label: string; value: string; tone?: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface p-4">
      <p className="text-sm text-muted">{label}</p>
      <p className={`num mt-1 truncate text-xl font-extrabold sm:text-2xl ${tone}`}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-xs text-muted">{hint}</p>}
    </div>
  )
}

function StatSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border border-line bg-surface p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-3 h-7 w-28" />
        </div>
      ))}
    </div>
  )
}

/* ---------- AI advisor interactive panel ---------- */

function AiAdvisorCard({ balance, currency, flow }: { balance: number; currency: string; flow: { inflow: number; outflow: number } }) {
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [response, setResponse] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const askAi = async (customPrompt?: string) => {
    const promptToSend = customPrompt || question
    if (!promptToSend.trim() || loading) return

    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem('token') || ''
      const res = await fetch('http://localhost:8080/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: promptToSend,
          context: `User Balance: ${balance} ${currency}, Money In (14d): ${flow.inflow} ${currency}, Money Out (14d): ${flow.outflow} ${currency}`,
        }),
      })

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`)
      }

      const data = await res.json()
      setResponse(data.reply || 'No advice generated. Try asking a more specific question.')
      if (!customPrompt) setQuestion('')
    } catch (err: any) {
      setError(err?.message || 'Failed to reach AI service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card
      title="FinMind AI Financial Advisor"
      action={
        <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          Gemini 3.8 Flash Online
        </span>
      }
    >
      <div className="space-y-4">
        {/* Suggestion pills */}
        <div className="flex flex-wrap gap-2 text-xs">
          <button
            type="button"
            disabled={loading}
            onClick={() => askAi(`Analyze my balance of ${balance} ${currency} and recent cash flow. What should I prioritize?`)}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-medium text-muted transition hover:border-brand/50 hover:text-fg disabled:opacity-50"
          >
            💡 Analyze my balance ({formatMoney(balance, currency)})
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => askAi('Give me a simple 50/30/20 budgeting rule based on my finances.')}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-medium text-muted transition hover:border-brand/50 hover:text-fg disabled:opacity-50"
          >
            📊 50/30/20 Budgeting Rule
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => askAi('Suggest 3 quick ways to cut monthly expenses without sacrificing essentials.')}
            className="rounded-lg border border-line bg-surface-2 px-3 py-1.5 font-medium text-muted transition hover:border-brand/50 hover:text-fg disabled:opacity-50"
          >
            📉 Reduce spending habits
          </button>
        </div>

        {/* Input box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            placeholder="Ask anything about your budget, savings goals, or spending..."
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askAi()}
            className="flex-1 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg outline-none transition placeholder:text-muted focus:border-brand"
          />
          <Button type="button" loading={loading} disabled={!question.trim()} onClick={() => askAi()}>
            Ask AI
          </Button>
        </div>

        {/* Output Area */}
        {error && <ErrorMessage message={error} />}

        {loading && (
          <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm text-muted animate-pulse">
            FinMind AI is analyzing your financial records and preparing actionable recommendations...
          </div>
        )}

        {response && !loading && (
          <div className="rounded-xl border border-line bg-surface-2 p-4 text-sm leading-relaxed text-fg whitespace-pre-wrap">
            <div className="mb-2 flex items-center justify-between border-b border-line pb-2">
              <span className="font-semibold text-brand-text flex items-center gap-2">
                <Icon name="sparkles" className="h-4 w-4" /> FinMind AI Advisor
              </span>
              <button
                type="button"
                onClick={() => setResponse(null)}
                className="text-xs text-muted hover:text-fg"
              >
                Clear
              </button>
            </div>
            {response}
          </div>
        )}
      </div>
    </Card>
  )
}

/* ---------- page ---------- */

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [accountsError, setAccountsError] = useState<string | null>(null)
  const [recent, setRecent] = useState<Transaction[] | null>(null)
  const [recentError, setRecentError] = useState<string | null>(null)
  const [currency, setCurrency] = useState('')

  const loadAccounts = useCallback(() => {
    setAccountsError(null)
    api.listAccounts().then(setAccounts).catch((err) => setAccountsError(describe(err)))
  }, [])

  const loadRecent = useCallback(() => {
    setRecentError(null)
    api
      .listTransactions({ from: lastDays(CHART_DAYS)[0], page: 0, size: 100 })
      .then((p) => setRecent(p.content))
      .catch((err) => setRecentError(describe(err)))
  }, [])

  const reloadAll = useCallback(() => {
    loadAccounts()
    loadRecent()
  }, [loadAccounts, loadRecent])

  useEffect(reloadAll, [reloadAll])

  const currencies = useMemo(() => [...new Set((accounts ?? []).map((a) => a.currency))], [accounts])
  const activeCurrency = currencies.includes(currency) ? currency : (currencies[0] ?? 'INR')

  const balance = (accounts ?? []).filter((a) => a.currency === activeCurrency).reduce((s, a) => s + a.balance, 0)
  const flow = useMemo(() => totals(recent ?? [], activeCurrency), [recent, activeCurrency])

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-1 text-sm text-muted">Your balances and the last {CHART_DAYS} days of cash flow. All simulated.</p>
      </div>

      {accountsError ? (
        <ErrorState message={accountsError} onRetry={loadAccounts} />
      ) : !accounts ? (
        <StatSkeletons />
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label={`Total balance${currencies.length > 1 ? ` (${activeCurrency})` : ''}`} value={formatMoney(balance, activeCurrency)} />
          <Stat label="Accounts" value={String(accounts.length)} hint={currencies.length > 1 ? `${currencies.length} currencies` : undefined} />
          <Stat label={`Money in, ${CHART_DAYS} days`} value={recent ? formatMoney(flow.inflow, activeCurrency) : '…'} tone="text-income" />
          <Stat label={`Money out, ${CHART_DAYS} days`} value={recent ? formatMoney(flow.outflow, activeCurrency) : '…'} tone="text-expense" />
        </div>
      )}

      {/* AI Financial Advisor section embedded directly on dashboard */}
      <AiAdvisorCard balance={balance} currency={activeCurrency} flow={flow} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card
          title="Cash flow"
          action={
            currencies.length > 1 ? (
              <select
                aria-label="Currency"
                value={activeCurrency}
                onChange={(e) => setCurrency(e.target.value)}
                className="rounded-lg border border-line bg-surface-2 px-2 py-1 text-sm outline-none transition hover:border-brand/50 focus:border-brand"
              >
                {currencies.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            ) : undefined
          }
        >
          {recentError ? (
            <ErrorState message={recentError} onRetry={loadRecent} />
          ) : !recent ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-44 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : (
            <>
              <CashFlowChart transactions={recent} currency={activeCurrency} />
              {recent.length >= 100 && (
                <p className="mt-3 text-xs text-muted">Showing your 100 most recent transactions in this period.</p>
              )}
            </>
          )}
        </Card>

        <Card title="Your accounts">
          {accountsError ? (
            <ErrorState message={accountsError} onRetry={loadAccounts} />
          ) : !accounts ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : accounts.length === 0 ? (
            <EmptyState title="No accounts yet">Create your first account below to start moving money.</EmptyState>
          ) : (
            <ul className="space-y-2">
              {accounts.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/transactions?account=${a.id}`}
                    className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 transition hover:border-brand/50 hover:bg-surface-2"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-text">
                      <Icon name="wallet" className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{a.name}</span>
                      <span className="num block truncate text-sm text-muted">{formatMoney(a.balance, a.currency)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Add an account or move money">
          <div className="space-y-6">
            <CreateAccountForm onCreated={loadAccounts} />
            {accounts && accounts.length > 0 && (
              <div className="border-t border-line pt-5">
                <OperationsForm accounts={accounts} onDone={reloadAll} />
              </div>
            )}
          </div>
        </Card>

        <Card
          title="Recent activity"
          action={
            <Link to="/transactions" className="text-sm font-semibold text-brand-text hover:underline">
              View all
            </Link>
          }
        >
          {recentError ? (
            <ErrorState message={recentError} onRetry={loadRecent} />
          ) : !recent || !accounts ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <EmptyState title="No activity yet">Deposits, withdrawals and transfers will show up here.</EmptyState>
          ) : (
            <ul>
              {recent.slice(0, 6).map((t) => (
                <TxItem key={t.id} tx={t} accounts={accounts} />
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
