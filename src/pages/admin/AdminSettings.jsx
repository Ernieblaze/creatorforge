import { useState } from 'react'
import { ShieldCheck, ScrollText, KeyRound } from 'lucide-react'
import { getAdminEmails } from '../../lib/supabase'
import { getAIConfig } from '../../lib/ai'
import { systemLogs } from '../../lib/adminData'
import { SectionHeader } from './shared'

const KIND_STYLES = {
  'ai-call': 'bg-brand-500/12 text-brand-500',
  auth: 'bg-emerald-500/10 text-emerald-500',
  announcement: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  system: 'bg-slate-100 text-slate-500 dark:bg-ink-700 dark:text-slate-400',
}

export default function AdminSettings() {
  const [logs] = useState(() => systemLogs())
  const admins = getAdminEmails()
  const ai = getAIConfig()

  return (
    <div className="space-y-6">
      <SectionHeader title="Settings" subtitle="Admin access, provider config and system logs." />

      {/* Admin access */}
      <section className="card p-5">
        <h2 className="mb-1 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ShieldCheck size={17} className="text-brand-400" /> Admin access
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Admin emails come from <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-ink-700">VITE_ADMIN_EMAIL</code> in <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-ink-700">.env</code>.
          Editing requires a redeploy — env values can't be changed from the browser (that's the point: no one can promote themselves to admin from this page).
        </p>
        <div className="flex flex-wrap gap-2">
          {admins.length ? admins.map((e) => (
            <span key={e} className="rounded-full border border-brand-500/30 bg-brand-500/10 px-3.5 py-1.5 text-xs font-semibold text-brand-600 dark:text-brand-300">
              {e}
            </span>
          )) : (
            <span className="text-sm text-slate-400">No admin email configured — set VITE_ADMIN_EMAIL in .env.</span>
          )}
        </div>
      </section>

      {/* Provider snapshot */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <KeyRound size={17} className="text-brand-400" /> AI provider
        </h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          {[
            ['Provider', ai.provider],
            ['Model', ai.model || 'provider default'],
            ['API key', ai.apiKey ? '••••' + ai.apiKey.slice(-4) : 'not set (demo mode)'],
          ].map(([k, v]) => (
            <div key={k} className="rounded-xl border border-slate-200 px-4 py-3 dark:border-ink-600">
              <p className="text-xs text-slate-400">{k}</p>
              <p className="mt-0.5 font-semibold text-slate-800 dark:text-slate-100">{v}</p>
            </div>
          ))}
        </div>
      </section>

      {/* System logs */}
      <section className="card p-5">
        <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
          <ScrollText size={17} className="text-brand-400" /> System logs
        </h2>
        <div className="max-h-96 space-y-1.5 overflow-y-auto">
          {logs.map((l, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3.5 py-2 text-xs dark:bg-ink-800">
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${KIND_STYLES[l.kind] || KIND_STYLES.system}`}>
                {l.kind}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-600 dark:text-slate-300">{l.detail}</span>
              <span className="shrink-0 text-slate-400">{new Date(l.at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
