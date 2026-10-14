import { useMemo, useState } from 'react'
import type { Transaction } from '../types'
import { formatMoney } from './format'

export const CHART_DAYS = 14

interface Day {
  key: string
  label: string
  inflow: number
  outflow: number
}

/** UTC calendar days, oldest first, matching how the backend filters by date. */
export function lastDays(n: number): string[] {
  const out: string[] = []
  for (let i = n - 1; i >= 0; i--) out.push(new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10))
  return out
}

function buildDays(transactions: Transaction[], currency: string): Day[] {
  const days = lastDays(CHART_DAYS).map<Day>((key) => ({
    key,
    label: new Date(`${key}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
    inflow: 0,
    outflow: 0,
  }))
  const byKey = new Map(days.map((d) => [d.key, d]))
  for (const t of transactions) {
    if (t.currency !== currency) continue
    const day = byKey.get(t.createdAt.slice(0, 10))
    if (!day) continue
    if (t.type === 'DEPOSIT') day.inflow += t.amount
    else if (t.type === 'WITHDRAWAL') day.outflow += t.amount // transfers between own accounts are not cash flow
  }
  return days
}

export function totals(transactions: Transaction[], currency: string) {
  const days = buildDays(transactions, currency)
  return {
    inflow: days.reduce((s, d) => s + d.inflow, 0),
    outflow: days.reduce((s, d) => s + d.outflow, 0),
  }
}

/** Plain HTML/CSS bars, so labels stay readable on phones and nothing can overflow the card. */
export default function CashFlowChart({ transactions, currency }: { transactions: Transaction[]; currency: string }) {
  const days = useMemo(() => buildDays(transactions, currency), [transactions, currency])
  const max = Math.max(1, ...days.flatMap((d) => [d.inflow, d.outflow]))
  const [activeKey, setActiveKey] = useState<string | null>(null)
  const active = days.find((d) => d.key === activeKey)
  const empty = days.every((d) => d.inflow === 0 && d.outflow === 0)

  return (
    <div>
      <p className="num mb-3 min-h-5 text-sm text-muted" aria-live="polite">
        {active ? (
          <>
            <span className="font-semibold text-fg">{active.label}</span>
            {'  '}In <span className="text-income">{formatMoney(active.inflow, currency)}</span>
            {'  '}Out <span className="text-expense">{formatMoney(active.outflow, currency)}</span>
          </>
        ) : (
          'Hover or tap a day for details'
        )}
      </p>
      <div className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bottom-0 bg-[linear-gradient(to_bottom,var(--line)_1px,transparent_1px)] bg-[length:100%_25%] opacity-60"
        />
        <div className="relative flex h-44 items-end gap-1 sm:gap-1.5">
          {days.map((d) => (
            <div
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={`${d.label}: in ${formatMoney(d.inflow, currency)}, out ${formatMoney(d.outflow, currency)}`}
              onMouseEnter={() => setActiveKey(d.key)}
              onMouseLeave={() => setActiveKey(null)}
              onFocus={() => setActiveKey(d.key)}
              onBlur={() => setActiveKey(null)}
              onClick={() => setActiveKey(d.key)}
              className={`flex h-full min-w-0 flex-1 cursor-pointer items-end justify-center gap-px rounded-md transition ${activeKey === d.key ? 'bg-brand-soft' : 'hover:bg-surface-2'}`}
            >
              <span className="bar-grow w-full max-w-4 rounded-t bg-income" style={{ height: `${(d.inflow / max) * 100}%` }} />
              <span className="bar-grow w-full max-w-4 rounded-t bg-expense" style={{ height: `${(d.outflow / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs text-muted">
        <span>{days[0].label}</span>
        <span className="hidden sm:block">{days[Math.floor(days.length / 2)].label}</span>
        <span>{days[days.length - 1].label}</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-income" />Money in (deposits)</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-expense" />Money out (withdrawals)</span>
      </div>
      {empty && <p className="mt-3 text-sm text-muted">No deposits or withdrawals in the last {CHART_DAYS} days yet.</p>}
    </div>
  )
}
