import type { Account, Transaction } from '../types'
import { formatDateTime, formatMoney } from './format'
import Icon from './Icon'

export function describeTx(t: Transaction, accounts: Account[]) {
  const nameOf = (id?: string) => accounts.find((a) => a.id === id)?.name ?? 'Account'
  const debit = t.entries.find((e) => e.entryType === 'DEBIT')
  const credit = t.entries.find((e) => e.entryType === 'CREDIT')
  const title =
    t.type === 'TRANSFER' ? `${nameOf(debit?.accountId)} to ${nameOf(credit?.accountId)}` : nameOf((debit ?? credit)?.accountId)
  const label = t.type === 'DEPOSIT' ? 'Deposit' : t.type === 'WITHDRAWAL' ? 'Withdrawal' : 'Transfer'
  const sign = t.type === 'DEPOSIT' ? '+' : t.type === 'WITHDRAWAL' ? '−' : ''
  const tone = t.type === 'DEPOSIT' ? 'text-income' : t.type === 'WITHDRAWAL' ? 'text-expense' : 'text-fg'
  return { title, label, sign, tone }
}

export function TxIcon({ type }: { type: Transaction['type'] }) {
  const style =
    type === 'DEPOSIT' ? 'bg-income/15 text-income' : type === 'WITHDRAWAL' ? 'bg-expense/15 text-expense' : 'bg-brand-soft text-brand-text'
  const icon = type === 'DEPOSIT' ? 'arrowDown' : type === 'WITHDRAWAL' ? 'arrowUp' : 'swap'
  return (
    <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${style}`}>
      <Icon name={icon} className="h-4 w-4" />
    </span>
  )
}

/** One transaction as a row. Used for recent activity and for the phone-sized history list. */
export default function TxItem({ tx, accounts }: { tx: Transaction; accounts: Account[] }) {
  const d = describeTx(tx, accounts)
  return (
    <li className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-surface-2">
      <TxIcon type={tx.type} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{d.title}</p>
        <p className="truncate text-xs text-muted">
          {d.label}
          {tx.description ? `, ${tx.description}` : ''}
        </p>
        <p className="text-xs text-muted">{formatDateTime(tx.createdAt)}</p>
      </div>
      <p className={`num shrink-0 text-sm font-bold ${d.tone}`}>
        {d.sign}
        {formatMoney(tx.amount, tx.currency)}
      </p>
    </li>
  )
}
