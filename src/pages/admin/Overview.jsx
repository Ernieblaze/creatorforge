import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, Activity, Banknote, Cpu, ArrowRight } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fetchUsers, fetchPayments, fetchDailyUsage } from '../../lib/adminData'
import { isSupabaseConfigured } from '../../lib/supabase'
import { StatCard, SectionHeader, CHART_COLOR, useChartTheme, tooltipStyles, naira } from './shared'

export default function Overview() {
  const [users, setUsers] = useState([])
  const [payments, setPayments] = useState([])
  const [usage, setUsage] = useState([])
  const ct = useChartTheme()

  useEffect(() => {
    fetchUsers().then(setUsers)
    fetchPayments().then(setPayments)
    fetchDailyUsage(14).then(setUsage)
  }, [])

  const activeToday = users.filter((u) => u.last_active && Date.now() - new Date(u.last_active) < 864e5).length
  const mrr = payments
    .filter((p) => p.status === 'active')
    .reduce((s, p) => s + (p.interval === 'monthly' ? p.amount : Math.round(p.amount / 12)), 0)
  const monthKey = new Date().toISOString().slice(0, 7)
  const spendThisMonth = usage.filter((d) => d.key.startsWith(monthKey)).reduce((s, d) => s + d.cost, 0)

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Overview"
        subtitle={`Platform health at a glance${isSupabaseConfigured ? '' : ' · demo data until Supabase is connected'}`}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={users.length} sub={`${users.filter((u) => u.plan === 'premium').length} premium`} />
        <StatCard icon={Activity} label="Active today" value={activeToday} sub="opened the app in 24h" color="bg-emerald-500/10 text-emerald-500" />
        <StatCard icon={Banknote} label="Total revenue (MRR)" value={naira(mrr)} sub="normalized monthly" color="bg-amber-500/10 text-amber-500" />
        <StatCard icon={Cpu} label="AI spend this month" value={`$${spendThisMonth.toFixed(2)}`} sub="estimated from provider pricing" color="bg-accent-500/10 text-accent-500" />
      </div>

      {/* Daily AI calls — quick pulse */}
      <section className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 dark:text-white">Generations per day — last 14 days</h2>
          <Link to="/admin/ai" className="flex items-center gap-1 text-xs font-semibold text-brand-500 hover:underline">
            Full usage report <ArrowRight size={13} />
          </Link>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={usage} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke={ct.grid} />
              <XAxis dataKey="label" tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip {...tooltipStyles(ct)} formatter={(v) => [v, 'generations']} />
              <Bar dataKey="calls" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={26} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Shortcuts */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { to: '/admin/users', title: 'Manage users', desc: 'Search, sort, view activity' },
          { to: '/admin/flags', title: 'Feature flags', desc: 'Toggle tools on/off globally' },
          { to: '/admin/announcements', title: 'Announce something', desc: 'Banner for all users' },
        ].map((s) => (
          <Link key={s.to} to={s.to} className="card group flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-lg">
            <span>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{s.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{s.desc}</p>
            </span>
            <ArrowRight size={16} className="shrink-0 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-500" />
          </Link>
        ))}
      </div>
    </div>
  )
}
