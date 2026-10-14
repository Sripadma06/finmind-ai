import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark'
const KEY = 'finmind.theme'

interface ThemeState {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeState | null>(null)

function initialTheme(): Theme {
  // index.html already applied the right class before paint; read it back so React agrees with the DOM.
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      /* storage can be blocked (private mode); the theme still works for this visit */
    }
  }, [theme])

  const toggle = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), [])
  const value = useMemo(() => ({ theme, toggle }), [theme, toggle])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
