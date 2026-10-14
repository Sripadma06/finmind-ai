import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'finmind.theme'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function initialTheme(): Theme {
  // index.html already applied the right class before paint; read it back so React agrees.
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next: Theme = t === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem(KEY, next)
      } catch {
        /* storage blocked: the theme still changes for this visit */
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
