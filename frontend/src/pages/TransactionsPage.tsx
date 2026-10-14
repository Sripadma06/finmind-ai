import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatDateTime, formatMoney } from '../components/format'
import TxItem, { describeTx, TxIcon } from '../components/TxItem'
import { Button, Card, EmptyState, ErrorState, Field, Select, Skeleton } from '../components/ui'
import { api, ApiError } from '../services/api'
import type { Account, Page, Transaction, TransactionType } from '../types'

const PAGE_SIZE = 10

export default function TransactionsPage() {
  const [params, setParams] = useSearchParams()
  const accountId = params.get('account') ?? ''

  const [accounts, setAccounts] = useState<Account[]>([])
  const [type, setType] = useState<TransactionType | ''>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState<Page<Transaction> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [reloadTick, setReloadTick] = useState(0)

  useEffect(() => {
    api.listAccounts().then(setAccounts).catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    api
      .listTransactions({ accountId, type, from, to, page, size: PAGE_SIZE })
      .then((d) => {
        if (!cancelled) {
          setData(d)
          setError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'Could not load transactions.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accountId, type, from, to, page, reloadTick])

  const retry = useCallback(() => setReloadTick((n) => n + 1), [])

  function setAccount(id: string) {
    setPage(0)
    const next = new URLSearchParams(params)
    if (id) next.set('account', id)
    else next.delete('account')
    setParams(next, { replace: true })
  }

  const filtersActive = Boolean(accountId || type || from || to)
  function clearFilters() {
    setPage(0)
    setType('')
    setFrom('')
    setTo('')
    setParams({}, { replace: true })
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Transactions</h1>
        <p className="mt-1 text-sm text-muted">Everything that moved, newest first.</p>
      </div>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Account" value={accountId} onChange={(e) => setAccount(e.target.value)}>
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
          <Select
            label="Type"
            value={type}
            onChange={(e) => {
              setPage(0)
              setType(e.target.value as TransactionType | '')
            }}
          >
            <option value="">All types</option>
            <option value="DEPOSIT">Deposit</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="TRANSFER">Transfer</option>
          </Select>
          <Field label="From" type="date" value={from} onChange={(e) => { setPage(0); setFrom(e.target.value) }} />
          <Field label="To" type="date" value={to} onChange={(e) => { setPage(0); setTo(e.target.value) }} />
        </div>
        {filtersActive && (
          <div className="mt-3">
            <Button variant="subtle" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        )}
      </Card>

      <Card>
        {error ? (
          <ErrorState message={error} onRetry={retry} />
        ) : !data ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : data.content.length === 0 ? (
          <EmptyState title="No transactions match">
            {filtersActive ? 'Try removing a filter or widening the dates.' : 'Make a deposit from the dashboard to see it here.'}
          </EmptyState>
        ) : (
          <div className={`transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {/* Phones: a card list, so there is never a sideways-scrolling table. */}
            <ul className="md:hidden">
              {data.content.map((t) => (
                <TxItem key={t.id} tx={t} accounts={accounts} />
              ))}
            </ul>

            <table className="hidden w-full table-fixed text-left text-sm md:table">
              <thead className="border-b border-line text-muted">
                <tr>
                  <th className="w-44 py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Details</th>
                  <th className="w-36 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((t) => {
                  const d = describeTx(t, accounts)
                  return (
                    <tr key={t.id} className="border-b border-line/60 transition last:border-0 hover:bg-surface-2">
                      <td className="py-3 pr-4 text-muted">{formatDateTime(t.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <TxIcon type={t.type} />
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{d.title}</p>
                            <p className="truncate text-xs text-muted">
                              {d.label}
                              {t.description ? `, ${t.description}` : ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className={`num py-3 text-right font-bold ${d.tone}`}>
                        {d.sign}
                        {formatMoney(t.amount, t.currency)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-sm text-muted">
            <span>
              Page {data.page + 1} of {data.totalPages}, {data.totalElements} in total
            </span>
            <div className="flex gap-2">
              <Button variant="ghost" disabled={page === 0 || loading} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="ghost" disabled={page + 1 >= data.totalPages || loading} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </>
  )
}
