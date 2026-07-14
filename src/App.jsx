import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import Login from './pages/Login'

// Route-level code splitting: the public landing/login load instantly;
// the logged-in app and admin ship as separate chunks.
const AppLayout = lazy(() => import('./layout/AppLayout'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ToolPage = lazy(() => import('./pages/ToolPage'))
const Library = lazy(() => import('./pages/Library'))
const Settings = lazy(() => import('./pages/Settings'))
const Pricing = lazy(() => import('./pages/Pricing'))

// Admin dashboard (own layout + guard inside AdminLayout)
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminOverview = lazy(() => import('./pages/admin/Overview'))
const AdminUsers = lazy(() => import('./pages/admin/UsersSection'))
const AdminRevenue = lazy(() => import('./pages/admin/RevenueSection'))
const AdminTools = lazy(() => import('./pages/admin/ToolAnalytics'))
const AdminAi = lazy(() => import('./pages/admin/AiUsage'))
const AdminFlags = lazy(() => import('./pages/admin/FlagsSection'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AnnouncementsSection'))
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'))

// Public link-in-bio pages (/u/:slug) — no auth required
const BioPage = lazy(() => import('./pages/BioPage'))

const FullScreenLoader = (
  <div className="grid min-h-screen place-items-center dark:bg-ink-900">
    <Spinner size={28} className="text-brand-500" />
  </div>
)

function Protected({ children }) {
  const { user, loading } = useAuth()
  if (loading) return FullScreenLoader
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Suspense fallback={FullScreenLoader}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/u/:slug" element={<BioPage />} />
        <Route
          path="/app"
          element={
            <Protected>
              <AppLayout />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="tool/:id" element={<ToolPage />} />
          <Route path="library" element={<Library />} />
          <Route path="settings" element={<Settings />} />
          <Route path="pricing" element={<Pricing />} />
          {/* old admin location → new dedicated section */}
          <Route path="admin" element={<Navigate to="/admin" replace />} />
        </Route>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="revenue" element={<AdminRevenue />} />
          <Route path="tools" element={<AdminTools />} />
          <Route path="ai" element={<AdminAi />} />
          <Route path="flags" element={<AdminFlags />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
