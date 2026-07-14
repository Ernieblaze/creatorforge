import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Flame, FileText, Gauge, ArrowRight, Lightbulb, Clock, Crown, BatteryCharging } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getStats, getUsageToday, applyPendingReferral } from '../lib/db'
import { TOOLS, getTool } from '../lib/tools'
import { isToolEnabled } from '../lib/adminData'
import { useToast } from '../components/toast'
import Onboarding from '../components/Onboarding'

const QUICK_TOOLS = ['post-generator', 'yt-script', 'bio-link', 'audience-lab', 'image-prompts', 'repurposer', 'viral-score', 'ad-generator', 'strategist']

/** Rotating daily idea suggestions — clicking one pre-fills the tool via ?topic=. */
const IDEA_POOL = [
  { idea: '"What ₦20k gets you in my business" — cost breakdown post', tool: 'post-generator', topic: 'What ₦20k gets you in my business — honest cost breakdown' },
  { idea: 'Duet/react to the most viral take in your niche this week', tool: 'trends', topic: '' },
  { idea: 'Turn your best post this month into a 6-slide carousel', tool: 'repurposer', topic: '' },
  { idea: '60-second "beginner vs pro" comparison video', tool: 'yt-script', topic: 'Beginner vs pro: side-by-side comparison in 60 seconds' },
  { idea: 'Share the mistake that cost you money — with the lesson', tool: 'post-generator', topic: 'The mistake that cost me money and the lesson it taught me' },
  { idea: 'Run your last draft through the Viral Score before posting', tool: 'viral-score', topic: '' },
]

export default function Dashboard() {
  const { user, plan, profile, loading, refreshProfile } = useAuth()
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [usage, setUsage] = useState(null)
  const [onboardDone, setOnboardDone] = useState(false)
  const needsOnboarding = !loading && profile && !profile.niche && !onboardDone
  const name = (user?.user_metadata?.full_name || user?.email || 'Creator').split(/[@ ]/)[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const ideas = IDEA_POOL.slice(new Date().getDate() % 3, (new Date().getDate() % 3) + 3)

  useEffect(() => {
    if (!user) return
    getStats(user.id).then(setStats)
    getUsageToday(user.id, plan).then(setUsage)
  }, [user, plan])

  // Redeem a pending invite link (?ref=) — both sides get +5 bonus credits
  useEffect(() => {
    if (!user || !profile || profile.referred_by) return
    applyPendingReferral(user.id).then((granted) => {
      if (granted) {
        toast('🎁 Invite bonus applied — you got +5 bonus credits!')
        refreshProfile()
      }
    })
  }, [user, profile]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
            {greeting}, {name} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Let's make something worth sharing today.
          </p>
        </div>
        {usage && plan === 'free' && (
          <span className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-500 dark:border-ink-600 dark:text-slate-400">
            {usage.remaining} / {usage.limit} daily credits left
          </span>
        )}
        {plan === 'premium' && (
          <Link to="/app/settings" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3.5 py-1.5 text-xs font-bold text-amber-500 transition-colors hover:border-amber-400">
            <Crown size={13} /> Premium active
          </Link>
        )}
      </div>

      {needsOnboarding && <Onboarding onDone={() => setOnboardDone(true)} />}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { icon: FileText, label: 'Content generated', value: stats ? stats.total : '—', color: 'text-brand-500 bg-brand-500/10' },
          { icon: Flame, label: 'Day streak', value: stats ? `${stats.streak} 🔥` : '—', color: 'text-orange-500 bg-orange-500/10' },
          { icon: Gauge, label: 'Tools used', value: stats ? Object.keys(stats.byTool).length : '—', color: 'text-emerald-500 bg-emerald-500/10' },
          { icon: BatteryCharging, label: plan === 'free' ? 'Credits left today' : 'Credits used today', value: usage ? (plan === 'free' ? usage.remaining : usage.used) : '—', color: 'text-accent-500 bg-accent-500/10' },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="card p-4 sm:p-5"
          >
            <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${s.color}`}>
              <s.icon size={17} />
            </div>
            <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Upgrade banner */}
      {plan === 'free' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-brand-600 to-accent-600 px-5 py-4 text-white"
        >
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Crown size={17} /> Unlock unlimited generations, priority AI & exports — ₦3,000/month.
          </p>
          <Link to="/app/pricing" className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-brand-700 transition-transform hover:scale-[1.03]">
            Upgrade
          </Link>
        </motion.div>
      )}

      {/* Quick tools */}
      <section>
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Quick create</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_TOOLS.filter(isToolEnabled).map((id, i) => {
            const t = getTool(id)
            return (
              <motion.div key={id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Link
                  to={`/app/tool/${id}`}
                  className="card group flex items-center gap-4 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-lg hover:shadow-brand-600/10"
                >
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${t.color} text-white transition-transform group-hover:scale-110`}>
                    <t.icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{t.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{t.tagline}</p>
                  </span>
                  <ArrowRight size={16} className="text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* One-tap caption shortcuts → Post Generator with the platform preselected */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Quick captions:</span>
          {['WhatsApp', 'Instagram', 'TikTok', 'Facebook', 'X (Twitter)', 'LinkedIn'].map((p) => (
            <Link
              key={p}
              to={`/app/tool/post-generator?platform=${encodeURIComponent(p)}`}
              className="rounded-full border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400"
            >
              {p.replace(' (Twitter)', '')} caption
            </Link>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's ideas */}
        <section className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-bold text-slate-900 dark:text-white">
            <Lightbulb size={17} className="text-amber-400" /> Today's ideas
          </h2>
          <div className="space-y-3">
            {ideas.map((it) => (
              <Link
                key={it.idea}
                to={`/app/tool/${it.tool}${it.topic ? `?topic=${encodeURIComponent(it.topic)}` : ''}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm transition-colors hover:border-brand-400/60 dark:border-ink-600"
              >
                <span className="text-slate-600 dark:text-slate-300">{it.idea}</span>
                <ArrowRight size={15} className="shrink-0 text-slate-300 group-hover:text-brand-500" />
              </Link>
            ))}
          </div>
        </section>

        {/* Recent activity */}
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Clock size={17} className="text-brand-400" /> Recent activity
            </h2>
            <Link to="/app/library" className="text-xs font-semibold text-brand-500 hover:underline">View all</Link>
          </div>
          {stats?.recent?.length ? (
            <div className="space-y-2">
              {stats.recent.map((g) => {
                const t = getTool(g.tool) || TOOLS[0]
                return (
                  <Link key={g.id} to="/app/library" className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-ink-800">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${t.color} text-white`}>
                      <t.icon size={14} />
                    </span>
                    <span className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{g.title || t.name}</p>
                      <p className="text-xs text-slate-400">{t.name} · {new Date(g.created_at).toLocaleDateString()}</p>
                    </span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">
              Nothing yet — generate your first piece of content! ✨
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
