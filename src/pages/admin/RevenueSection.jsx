import { useEffect, useState } from 'react'
import { Banknote, Repeat, TrendingUp } from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fetchPayments, monthlyRevenueSeries } from '../../lib/adminData'
import { StatCard, SectionHeader, CHART_COLOR, useChartTheme, tooltipStyles, naira } from './shared'

export default function RevenueSection() {
  const [payments, setPayments] = useState([])
  const ct = useChartTheme()

  useEffect(() => { fetchPayments().then(setPayments) }, [])

  const active = payments.filter((p) => p.status === 'active')
  const mrr = active.reduce((s, p) => s + (p.interval === 'monthly' ? p.amount : Math.round(p.amount / 12)), 0)
  const series = monthlyRevenueSeries(payments)
  const growth = series.length > 1 && series.at(-2).revenue
    ? Math.round(((series.at(-1).revenue - series.at(-2).revenue) / series.at(-2).revenue) * 100)
    : 0

  return (
    <div className="space-y-6">
      <SectionHeader title="Revenue & Subscriptions" subtitle="₦3,000/month · ₦30,000/year — flip plans server-side via the Paystack webhook" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={Banknote} label="MRR" value={naira(mrr)} sub="yearly plans normalized" color="bg-emerald-500/10 text-emerald-500" />
        <StatCard icon={Repeat} label="Active subscriptions" value={active.length} sub={`${active.filter((p) => p.interval === 'yearly').length} yearly`} />
        <StatCard icon={TrendingUp} label="Month-over-month" value={`${growth >= 0 ? '+' : ''}${growth}%`} sub="revenue growth" color="bg-amber-500/10 text-amber-500" />
      </div>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Monthly revenue — last 6 months</h2>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series} margin={{ top: 4, right: 4, left: -6, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid vertical={false} stroke={ct.grid} />
              <XAxis dataKey="label" tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `₦${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`} />
              <Tooltip {...tooltipStyles(ct)} formatter={(v) => [naira(v), 'revenue']} />
              <Bar dataKey="revenue" fill={CHART_COLOR} radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 font-bold text-slate-900 dark:text-white">Recent payments</h2>
        {payments.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No payments yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-130 text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-400 dark:border-ink-700">
                  <th className="pb-2.5 pr-4 font-semibold">User</th>
                  <th className="pb-2.5 pr-4 font-semibold">Amount</th>
                  <th className="pb-2.5 pr-4 font-semibold">Plan</th>
                  <th className="pb-2.5 pr-4 font-semibold">Status</th>
                  <th className="pb-2.5 font-semibold">Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0 dark:border-ink-800">
                    <td className="py-3 pr-4">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">{p.user}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </td>
                    <td className="py-3 pr-4 font-semibold text-slate-700 dark:text-slate-200">{naira(p.amount)}</td>
                    <td className="py-3 pr-4 capitalize text-slate-500 dark:text-slate-400">{p.interval}</td>
                    <td className="py-3 pr-4">
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                        p.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-500 dark:bg-ink-700 dark:text-slate-400'
                      }`}>{p.status}</span>
                    </td>
                    <td className="py-3 text-slate-500 dark:text-slate-400">{new Date(p.at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
