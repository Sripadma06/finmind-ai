import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { BrandMark } from './Icon'

export default function ProtectedRoute() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
        <BrandMark className="h-12 w-12 animate-pulse" />
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
