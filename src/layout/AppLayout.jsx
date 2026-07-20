import { useEffect, useState } from 'react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, FolderHeart, Settings as SettingsIcon, Crown,
  ShieldCheck, LogOut, Wrench, Megaphone, X, Handshake,
} from 'lucide-react'
import { Logo, ThemeToggle } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { TOOLS } from '../lib/tools'
import { isNative } from '../lib/native'
import { isToolEnabled } from '../lib/adminData'
import { getActiveAnnouncement, subscribeAnnouncements } from '../lib/announcements'
import StrategistDock from '../components/StrategistDock'

/**
 * Announcement published from Admin → shown to all users until dismissed.
 * Loads from the Supabase `announcements` table and updates live via
 * realtime; dismissal is remembered per-announcement on this device.
 */
function AnnouncementBanner() {
  const [ann, setAnn] = useState(null)
  const [dismissedKey, setDismissedKey] = useState(() => localStorage.getItem('cf_announcement_seen'))

  useEffect(() => {
    getActiveAnnouncement().then(setAnn)
    return subscribeAnnouncements(setAnn)
  }, [])

  const key = String(ann?.id ?? ann?.at ?? '')
  if (!ann?.text || dismissedKey === key) return null
  return (
    <div className="mb-5 flex animate-fade-up items-start justify-between gap-3 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-accent-500/10 px-4 py-3">
      <p className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-200">
        <Megaphone size={16} className="mt-0.5 shrink-0 text-brand-500" /> {ann.text}
      </p>
      <button
        onClick={() => { localStorage.setItem('cf_announcement_seen', key); setDismissedKey(key) }}
        aria-label="Dismiss announcement"
        className="shrink-0 text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200"
      >
        <X size={15} />
      </button>
    </div>
  )
}

/**
 * "Install app" invitation. Android/Chrome: uses the captured
 * beforeinstallprompt event for a real one-tap install. iOS Safari has no
 * install API — show the Share → Add to Home Screen hint instead.
 * Dismissal is remembered on this device.
 */
function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [dismissed, setDismissed] = useState(() => Boolean(localStorage.getItem('cf_install_dismissed')))
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  // Never prompt to "install" inside the native app — they already have it.
  if (isNative || dismissed || isStandalone) return null
  if (!deferred && !isIOS) return null

  const dismiss = () => { localStorage.setItem('cf_install_dismissed', '1'); setDismissed(true) }

  return (
    <div className="mb-5 flex items-center justify-between gap-3 rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-500/10 to-accent-500/10 px-4 py-3 lg:hidden">
      <p className="text-sm text-slate-700 dark:text-slate-200">
        📲 <b>Install CreatorForge</b>{' '}
        {deferred
          ? '— one tap, opens like a real app.'
          : '— tap Share, then "Add to Home Screen".'}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        {deferred && (
          <button
            onClick={async () => { deferred.prompt(); const { outcome } = await deferred.userChoice; if (outcome === 'accepted') dismiss(); setDeferred(null) }}
            className="rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-3.5 py-1.5 text-xs font-bold text-white"
          >
            Install
          </button>
        )}
        <button onClick={dismiss} aria-label="Dismiss" className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
          <X size={15} />
        </button>
      </div>
    </div>
  )
}

const navItem = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
    isActive
      ? 'bg-brand-500/12 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300'
      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-ink-800 dark:hover:text-slate-200'
  }`

export default function AppLayout() {
  const { user, plan, isAdmin, signOut } = useAuth()
  const location = useLocation()
  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Creator'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-ink-900">
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-ink-700 dark:bg-ink-850">
        <div className="flex h-16 items-center px-5"><Link to="/app"><Logo /></Link></div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          <NavLink to="/app" end className={navItem}>
            <LayoutDashboard size={17} /> Dashboard
          </NavLink>

          <p className="px-3 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Tools</p>
          {TOOLS.filter((t) => isToolEnabled(t.id)).map((t) => (
            <NavLink key={t.id} to={`/app/tool/${t.id}`} className={navItem}>
              <t.icon size={17} /> {t.name}
            </NavLink>
          ))}

          <p className="px-3 pt-5 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">Workspace</p>
          <NavLink to="/app/library" className={navItem}><FolderHeart size={17} /> Library</NavLink>
          <NavLink to="/app/partner" className={navItem}><Handshake size={17} /> Partner Program</NavLink>
          <NavLink to="/app/settings" className={navItem}><SettingsIcon size={17} /> Settings</NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navItem}><ShieldCheck size={17} /> Admin</NavLink>
          )}
        </nav>

        {plan === 'free' && (
          <div className="mx-3 mb-3 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-600 p-4 text-white">
            <p className="flex items-center gap-1.5 text-sm font-bold"><Crown size={15} /> Go Premium</p>
            <p className="mt-1 text-xs text-white/80">Unlimited generations for ₦3,000/mo.</p>
            <Link to="/app/pricing" className="mt-3 block rounded-lg bg-white/95 py-1.5 text-center text-xs font-bold text-brand-700 transition-transform hover:scale-[1.02]">
              Upgrade now
            </Link>
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-3.5 dark:border-ink-700">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
            {name[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{name}</p>
            <p className="text-xs capitalize text-slate-400">{plan} plan</p>
          </div>
          <button onClick={signOut} aria-label="Sign out" className="text-slate-400 transition-colors hover:text-rose-500">
            <LogOut size={17} />
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar ──────────────────────────────── */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/85 px-4 backdrop-blur-xl lg:hidden dark:border-ink-700 dark:bg-ink-900/85">
        <Link to="/app"><Logo /></Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              to="/admin"
              aria-label="Admin dashboard"
              className="grid h-9 w-9 place-items-center rounded-xl border border-brand-500/40 bg-brand-500/10 text-brand-500"
            >
              <ShieldCheck size={16} />
            </Link>
          )}
          <ThemeToggle />
          <button onClick={signOut} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-400 dark:border-ink-600">
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* ── Content ─────────────────────────────────────── */}
      <main className="px-4 pt-6 pb-24 sm:px-6 lg:ml-64 lg:pb-10" key={location.pathname}>
        <div className="mx-auto max-w-5xl animate-fade-in">
          <div className="mb-4 hidden justify-end lg:flex"><ThemeToggle /></div>
          <AnnouncementBanner />
          <InstallPrompt />
          <Outlet />
        </div>
      </main>

      <StrategistDock />

      {/* ── Mobile bottom nav ───────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden dark:border-ink-700 dark:bg-ink-850/95">
        {[
          { to: '/app', icon: LayoutDashboard, label: 'Home', end: true },
          { to: '/app/tools', icon: Wrench, label: 'Tools' },
          { to: '/app/library', icon: FolderHeart, label: 'Library' },
          { to: '/app/partner', icon: Handshake, label: 'Partner' },
          { to: '/app/settings', icon: SettingsIcon, label: 'Settings' },
        ].map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            end={i.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-brand-500' : 'text-slate-400'
              }`
            }
          >
            <i.icon size={19} /> {i.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
