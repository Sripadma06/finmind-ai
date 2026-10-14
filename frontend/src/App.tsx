import { Route, Routes } from 'react-router-dom'
import BackToTop from './components/BackToTop'
import CookieBanner from './components/CookieBanner'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import PublicShell from './components/PublicShell'
import AuthPage from './pages/AuthPage'
import DashboardPage from './pages/DashboardPage'
import { AboutPage, NotFoundPage, PrivacyPage } from './pages/InfoPages'
import TransactionsPage from './pages/TransactionsPage'

export default function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />

        <Route element={<PublicShell />}>
          <Route path="/about" element={<AboutPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
          </Route>
        </Route>
      </Routes>
      <CookieBanner />
      <BackToTop />
    </ErrorBoundary>
  )
}
