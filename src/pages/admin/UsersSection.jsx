import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, ChevronUp, ChevronDown, X, Eye } from 'lucide-react'
import { fetchUsers, fetchUserActivity } from '../../lib/adminData'
import { getTool, TOOLS } from '../../lib/tools'
import { SectionHeader } from './shared'
import { Spinner } from '../../components/ui'

const COLUMNS = [
  { key: 'username', label: 'User' },
  { key: 'plan', label: 'Plan' },
  { key: 'generations_today', label: 'Today' },
  { key: 'generation_count', label: 'Total' },
  { key: 'last_active', label: 'Last active' },
]

function timeAgo(iso) {
  if (!iso) return '—'
  const mins = Math.round((Date.now() - new Date(iso)) / 60000)
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`
  return `${Math.round(mins / 1440)}d ago`
}

/* ── Activity modal ──────────────────────────────────────── */
function ActivityModal({ user, onClose }) {
  const [items, setItems] = useState(null)
  useEffect(() => { fetchUserActivity(user.id).then(setItems) }, [user.id])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }}
        className="card w-full max-w-lg overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-ink-700">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-accent-500 text-sm font-bold text-white">
              {(user.username || user.email || '?')[0].toUpperCase()}
            </span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{user.username || '—'}</p>
              <p className="text-xs text-slate-400">{user.email} · <span className="capitalize">{user.plan}</span></p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 dark:border-ink-600">
            <X size={15} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Recent generations</p>
          {items === null ? (
            <div className="grid place-items-center py-10"><Spinner size={22} className="text-brand-500" /></div>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No activity yet.</p>
          ) : (
            <div className="space-y-2">
              {items.map((g) => {
                const t = getTool(g.tool) || TOOLS[0]
                return (
                  <div key={g.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 dark:border-ink-600">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${t.color} text-white`}>
                      <t.icon size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{g.title || t.name}</p>
                      <p className="text-xs text-slate-400">{t.name} · {timeAgo(g.created_at)}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main table ──────────────────────────────────────────── */
export default function UsersSection() {
  const [users, setUsers] = useState(null)
  const [query, setQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [sort, setSort] = useState({ key: 'last_active', dir: 'desc' })
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchUsers().then(setUsers) }, [])

  const shown = useMemo(() => {
    let list = users || []
    if (planFilter !== 'all') list = list.filter((u) => u.plan === planFilter)
    if (query) {
      const q = query.toLowerCase()
      list = list.filter((u) => `${u.username} ${u.email} ${u.niche}`.toLowerCase().includes(q))
    }
    const { key, dir } = sort
    return [...list].sort((a, b) => {
      let va = a[key] ?? '', vb = b[key] ?? ''
      if (key === 'last_active') { va = new Date(va || 0).getTime(); vb = new Date(vb || 0).getTime() }
      if (va < vb) return dir === 'asc' ? -1 : 1
      if (va > vb) return dir === 'asc' ? 1 : -1
      return 0
    })
  }, [users, query, planFilter, sort])

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }))
  }

  return (
    <div>
      <SectionHeader title="Users" subtitle="Search, sort, and inspect activity. Free plan is capped at 10 generations/day server-side." />

      {/* Filters — one row above the table */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-base !pl-9" placeholder="Search name, email or niche…" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['all', 'free', 'premium'].map((p) => (
            <button
              key={p}
              onClick={() => setPlanFilter(p)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                planFilter === p
                  ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                  : 'border-slate-300 text-slate-500 dark:border-ink-600 dark:text-slate-400'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        {users === null ? (
          <div className="grid place-items-center py-16"><Spinner size={24} className="text-brand-500" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-150 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-ink-700">
                  {COLUMNS.map((c) => (
                    <th key={c.key} className="px-4 py-3 font-semibold first:pl-5">
                      <button onClick={() => toggleSort(c.key)} className="inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-brand-500">
                        {c.label}
                        {sort.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />)}
                      </button>
                    </th>
                  ))}
                  <th className="px-4 py-3 pr-5 text-right font-semibold">Activity</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50/60 dark:border-ink-800 dark:hover:bg-ink-800/50">
                    <td className="px-4 py-3 pl-5">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{u.username || '—'}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                        u.plan === 'premium' ? 'bg-brand-500/12 text-brand-500' : 'bg-slate-100 text-slate-500 dark:bg-ink-700 dark:text-slate-400'
                      }`}>{u.plan}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600 dark:text-slate-300">
                      {u.generations_today}
                      {u.plan === 'free' && <span className="text-slate-400"> / 10</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{u.generation_count ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{timeAgo(u.last_active)}</td>
                    <td className="px-4 py-3 pr-5 text-right">
                      <button
                        onClick={() => setSelected(u)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400"
                      >
                        <Eye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-slate-400">No users match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selected && <ActivityModal user={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </div>
  )
}
