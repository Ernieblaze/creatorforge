import { NavLink, Outlet, Link, Navigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Banknote, BarChart3, Cpu, ToggleRight,
  Megaphone, Settings, ArrowLeft, ShieldCheck,
} from 'lucide-react'
import { Logo, ThemeToggle, Spinner } from '../../components/ui'
import { useAuth } from '../../context/AuthContext'

export const ADMIN_SECTIONS = [
  { to: '/admin', end: true, icon: LayoutDashboard, label: 'Overview' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/revenue', icon: Banknote, label: 'Revenue & Subs' },
  { to: '/admin/tools', icon: BarChart3, label: 'Tool Analytics' },
  { to: '/admin/ai', icon: Cpu, label: 'AI Usage & Cost' },
  { to: '/admin/flags', icon: ToggleRight, label: 'Feature Flags' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

const navItem = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-brand-500/12 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200'
  }`

/**
 * /admin shell. Access requires the signed-in user's email to match
 * VITE_ADMIN_EMAIL (or VITE_ADMIN_EMAILS) — everyone else is bounced
 * back to the user dashboard.
 */
export default function AdminLayout() {
  const { user, isAdmin, loading } = useAuth()

  if (loading)
    return (
      <div className="grid min-h-screen place-items-center dark:bg-ink-900">
        <Spinner size={28} className="text-brand-500" />
      </div>
    )
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/app" replace />

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-900">
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-ink-700 dark:bg-ink-850">
        <div className="flex h-16 items-center gap-2 px-5">
          <Link to="/app"><Logo /></Link>
          <span className="ml-1 flex items-center gap-1 rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-500">
            <ShieldCheck size={11} /> Admin
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {ADMIN_SECTIONS.map((s) => (
            <NavLink key={s.to} to={s.to} end={s.end} className={navItem}>
              <s.icon size={17} /> {s.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-3 dark:border-ink-700">
          <Link to="/app" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200">
            <ArrowLeft size={16} /> Back to app
          </Link>
        </div>
      </aside>

      {/* ── Mobile top bar + horizontal section nav ─────── */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur-xl lg:hidden dark:border-ink-700 dark:bg-ink-900/90">
        <div className="flex h-14 items-center justify-between px-4">
          <Link to="/app" className="flex items-center gap-2">
            <Logo />
            <span className="rounded-full bg-brand-500/12 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-500">Admin</span>
          </Link>
          <ThemeToggle />
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5">
          {ADMIN_SECTIONS.map((s) => (
            <NavLink
              key={s.to}
              to={s.to}
              end={s.end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                  isActive
                    ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                    : 'border-slate-200 text-slate-500 dark:border-ink-600 dark:text-slate-400'
                }`
              }
            >
              <s.icon size={13} /> {s.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <main className="px-4 pt-6 pb-16 sm:px-6 lg:ml-64">
        <div className="mx-auto max-w-5xl animate-fade-in">
          <div className="mb-4 hidden justify-end lg:flex"><ThemeToggle /></div>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
