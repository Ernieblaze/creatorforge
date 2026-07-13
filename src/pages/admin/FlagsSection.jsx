import { useState } from 'react'
import { ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react'
import { TOOLS } from '../../lib/tools'
import { getToolFlags, setToolFlag } from '../../lib/adminData'
import { SectionHeader } from './shared'

/**
 * Global tool flags. Disabling a tool hides it from the sidebar/dashboard
 * and blocks its route for all users on this device (localStorage for demo;
 * production: Supabase `flags` table + realtime).
 */
export default function FlagsSection() {
  const [flags, setFlags] = useState(getToolFlags)

  function toggle(id) {
    const next = { ...flags, [id]: flags[id] === false }
    setToolFlag(id, flags[id] === false)
    setFlags(next)
  }

  const disabledCount = TOOLS.filter((t) => flags[t.id] === false).length

  return (
    <div>
      <SectionHeader title="Feature Flags" subtitle="Toggle tools on/off globally. Disabled tools disappear from every user's sidebar and dashboard instantly." />

      {disabledCount > 0 && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-400">
          <AlertTriangle size={15} /> {disabledCount} tool{disabledCount > 1 ? 's' : ''} currently disabled for all users.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {TOOLS.map((t) => {
          const enabled = flags[t.id] !== false
          return (
            <button
              key={t.id}
              onClick={() => toggle(t.id)}
              className={`card flex items-center gap-3.5 p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${enabled ? '' : 'opacity-70'}`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white ${enabled ? '' : 'grayscale'}`}>
                <t.icon size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                <p className={`text-xs font-semibold ${enabled ? 'text-emerald-500' : 'text-slate-400'}`}>
                  {enabled ? 'Live for all users' : 'Disabled'}
                </p>
              </span>
              {enabled
                ? <ToggleRight size={30} className="shrink-0 text-emerald-500" />
                : <ToggleLeft size={30} className="shrink-0 text-slate-300 dark:text-ink-600" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
