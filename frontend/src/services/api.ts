import type { Account, AuthResponse, Page, Transaction, TransactionType, User } from '../types'

const BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`
const TOKEN_KEY = 'finmind.token'

/*
 * Token storage: localStorage keeps this demo simple, but any script on the page (XSS) could read it.
 * A production hardening step is an httpOnly, SameSite cookie issued by the backend.
 */
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

export class ApiError extends Error {
  status: number
  fieldErrors?: Record<string, string>

  constructor(status: number, message: string, fieldErrors?: Record<string, string>) {
    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let onUnauthorized: () => void = () => {}
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function request<T>(
  method: string,
  path: string,
  options: { body?: unknown; idempotencyKey?: string; auth?: boolean } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (options.idempotencyKey) headers['Idempotency-Key'] = options.idempotencyKey
  const token = tokenStore.get()
  if (token && options.auth !== false) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check your connection and try again.')
  }

  if (res.ok) {
    return (await res.json()) as T
  }

  let message = `Request failed (${res.status})`
  let fieldErrors: Record<string, string> | undefined
  try {
    const err = await res.json()
    if (err?.message) message = err.message
    fieldErrors = err?.fieldErrors
  } catch {
    /* non-JSON error body */
  }
  // A 401 on a protected call means the token expired or is invalid: sign the user out.
  if (res.status === 401 && options.auth !== false) onUnauthorized()
  throw new ApiError(res.status, message, fieldErrors)
}

export const api = {
  register: (name: string, email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/register', { body: { name, email, password }, auth: false }),
  login: (email: string, password: string) =>
    request<AuthResponse>('POST', '/auth/login', { body: { email, password }, auth: false }),
  me: () => request<User>('GET', '/users/me'),

  listAccounts: () => request<Account[]>('GET', '/accounts'),
  createAccount: (name: string, currency: string) =>
    request<Account>('POST', '/accounts', { body: { name, currency } }),

  deposit: (accountId: string, amount: string, description: string, key: string) =>
    request<Transaction>('POST', `/accounts/${accountId}/deposits`, {
      body: { amount, description: description || undefined },
      idempotencyKey: key,
    }),
  withdraw: (accountId: string, amount: string, description: string, key: string) =>
    request<Transaction>('POST', `/accounts/${accountId}/withdrawals`, {
      body: { amount, description: description || undefined },
      idempotencyKey: key,
    }),
  transfer: (fromAccountId: string, toAccountId: string, amount: string, description: string, key: string) =>
    request<Transaction>('POST', '/transfers', {
      body: { fromAccountId, toAccountId, amount, description: description || undefined },
      idempotencyKey: key,
    }),

  listTransactions: (params: {
    accountId?: string
    type?: TransactionType | ''
    from?: string
    to?: string
    page: number
    size: number
  }) => {
    const q = new URLSearchParams()
    if (params.accountId) q.set('accountId', params.accountId)
    if (params.type) q.set('type', params.type)
    if (params.from) q.set('from', params.from)
    if (params.to) q.set('to', params.to)
    q.set('page', String(params.page))
    q.set('size', String(params.size))
    return request<Page<Transaction>>('GET', `/transactions?${q.toString()}`)
  },
}
