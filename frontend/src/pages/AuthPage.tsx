import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import { BrandMark } from '../components/Icon'
import ThemeToggle from '../components/ThemeToggle'
import { Button, ErrorMessage, Field } from '../components/ui'
import { useAuth } from '../features/auth/AuthContext'
import { ApiError } from '../services/api'

export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const isRegister = mode === 'register'

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      if (isRegister) await register(name, email, password)
      else await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors ?? {})
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex justify-end px-4 py-3 sm:px-6">
        <ThemeToggle />
      </div>
      <main className="flex flex-1 items-center justify-center px-4 py-6">
        <div className="w-full max-w-sm min-w-0">
          <div className="mb-6 flex items-center gap-3">
            <BrandMark className="h-10 w-10" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">FinMind AI</h1>
              <p className="text-sm text-muted">{isRegister ? 'Create your account' : 'Sign in to your accounts'}</p>
            </div>
          </div>
          <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-line bg-surface p-5">
            {isRegister && (
              <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} autoComplete="name" error={fieldErrors.name} />
            )}
            <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" error={fieldErrors.email} />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 8 : undefined}
              maxLength={72}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              error={fieldErrors.password}
            />
            {isRegister && <p className="-mt-2 text-xs text-muted">Use 8 to 72 characters.</p>}
            <ErrorMessage message={error} />
            <Button type="submit" loading={busy} className="w-full">
              {isRegister ? 'Create account' : 'Sign in'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted">
            {isRegister ? (
              <>Already registered? <Link to="/login" className="font-semibold text-brand-text hover:underline">Sign in</Link></>
            ) : (
              <>New here? <Link to="/register" className="font-semibold text-brand-text hover:underline">Create an account</Link></>
            )}
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
