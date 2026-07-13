import { useEffect, useState } from 'react'
import { Cpu, Coins, Zap } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fetchDailyUsage, fetchRecentAiCalls, fetchUsers, topUsersByUsage } from '../../lib/adminData'
import { getAIConfig } from '../../lib/ai'
import { getTool, TOOLS } from '../../lib/tools'
import { isSupabaseConfigured } from '../../lib/supabase'
import { StatCard, SectionHeader, CHART_COLOR, useChartTheme, tooltipStyles } from './shared'

export default function AiUsage() {
  const [range, setRange] = useState(14)
  const [users, setUsers] = useState([])
  const [series, setSeries] = useState([])
  const [calls, setCalls] = useState([])
  const ct = useChartTheme()
  const cfg = getAIConfig()

  useEffect(() => { fetchUsers().then(setUsers) }, [])
  useEffect(() => { fetchDailyUsage(range).then(setSeries) }, [range])
  useEffect(() => { fetchRecentAiCalls().then(setCalls) }, [])

  const totalCost = series.reduce((s, d) => s + d.cost, 0)
  const totalTokens = series.reduce((s, d) => s + d.tokens, 0)
  const totalCalls = series.reduce((s, d) => s + d.calls, 0)
  const top = topUsersByUsage(users)
  const maxGen = top[0]?.generation_count || 1

  return (
    <div className="space-y-6">
      <SectionHeader
        title="AI Usage & Cost"
        subtitle={
          isSupabaseConfigured
            ? 'Live from the ai_usage table (written by the generate-content edge function). Provider is set via Supabase secrets.'
            : `Provider: ${cfg.provider} / ${cfg.model} — demo/local mode`
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Coins} label={`Spend — last ${range} days`} value={`$${totalCost.toFixed(2)}`} sub="estimated from provider pricing" color="bg-accent-500/10 text-accent-500" />
        <StatCard icon={Cpu} label="Tokens used" value={`${(totalTokens / 1000).toFixed(1)}k`} sub={`${totalCalls} calls`} />
        <StatCard icon={Zap} label="Avg cost / generation" value={`$${totalCalls ? (totalCost / totalCalls).toFixed(4) : '0.0000'}`} sub="input + output" color="bg-emerald-500/10 text-emerald-500" />
      </div>

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-slate-900 dark:text-white">Daily spend (USD)</h2>
          <div className="flex gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setRange(d)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                  range === d
                    ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                    : 'border-slate-300 text-slate-500 dark:border-ink-600 dark:text-slate-400'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 4, left: -14, bottom: 0 }} barCategoryGap="25%">
              <CartesianGrid vertical={false} stroke={ct.grid} />
              <XAxis dataKey="label" tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip {...tooltipStyles(ct)} formatter={(v, name) => (name === 'cost' ? [`$${v.toFixed(3)}`, 'spend'] : [v, name])} />
              <Bar dataKey="cost" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top users */}
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Top users by generations</h2>
          <div className="space-y-3">
            {top.map((u) => (
              <div key={u.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{u.username || u.email}</span>
                  <span className="text-xs font-bold text-slate-400">{u.generation_count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500" style={{ width: `${(u.generation_count / maxGen) * 100}%` }} />
                </div>
              </div>
            ))}
            {top.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No users yet.</p>}
          </div>
        </section>

        {/* Live call feed */}
        <section className="card p-5">
          <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Recent AI calls</h2>
          {calls.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">No AI calls logged yet — the feed fills as soon as generation runs through the edge function.</p>
          ) : (
            <div className="max-h-64 space-y-1.5 overflow-y-auto">
              {calls.map((u, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3.5 py-2 text-xs dark:bg-ink-800">
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {(getTool(u.tool) || TOOLS[0]).name} · <span className="text-slate-400">{u.provider}</span>
                  </span>
                  <span className="text-slate-400">
                    {u.tokens} tok · ${u.cost.toFixed(5)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
