import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, setUnauthorizedHandler, tokenStore } from '../../services/api'
import type { User } from '../../types'

interface AuthState {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(tokenStore.get() !== null)

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
  }, [logout])

  // On first load, if a token exists, find out who it belongs to (and whether it is still valid).
  useEffect(() => {
    if (!tokenStore.get()) return
    api
      .me()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<AuthState>(
    () => ({
      user,
      loading,
      logout,
      login: async (email, password) => {
        const res = await api.login(email, password)
        tokenStore.set(res.token)
        setUser(res.user)
      },
      register: async (name, email, password) => {
        const res = await api.register(name, email, password)
        tokenStore.set(res.token)
        setUser(res.user)
      },
    }),
    [user, loading, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
