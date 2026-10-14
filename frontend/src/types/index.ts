export interface User {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface AuthResponse {
  token: string
  tokenType: string
  expiresInSeconds: number
  user: User
}

export interface Account {
  id: string
  name: string
  currency: string
  balance: number
  createdAt: string
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER'

export interface Entry {
  accountId: string
  entryType: 'DEBIT' | 'CREDIT'
  amount: number
  balanceAfter: number
}

export interface Transaction {
  id: string
  referenceId: string
  type: TransactionType
  amount: number
  currency: string
  status: string
  description: string | null
  categoryId: string | null
  createdAt: string
  entries: Entry[]
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}
