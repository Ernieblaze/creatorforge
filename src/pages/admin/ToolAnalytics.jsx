import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { fetchToolUsage } from '../../lib/adminData'
import { getTool, TOOLS } from '../../lib/tools'
import { isSupabaseConfigured } from '../../lib/supabase'
import { SectionHeader, CHART_COLOR, useChartTheme, tooltipStyles } from './shared'

export default function ToolAnalytics() {
  const ct = useChartTheme()
  const [data, setData] = useState([])

  useEffect(() => {
    fetchToolUsage().then((entries) =>
      setData(entries.map(([id, count]) => ({ name: (getTool(id) || TOOLS[0]).name, count })))
    )
  }, [])
  const total = data.reduce((s, d) => s + d.count, 0)
  const top = data[0]

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tool Analytics"
        subtitle={`${total.toLocaleString()} generations tracked${isSupabaseConfigured ? '' : ' · demo data until live AI calls are logged'}`}
      />

      <section className="card p-5">
        <h2 className="mb-1 font-bold text-slate-900 dark:text-white">Most-used tools</h2>
        {top && (
          <p className="mb-4 text-xs text-slate-400">
            <span className="font-semibold text-brand-500">{top.name}</span> leads with {Math.round((top.count / total) * 100)}% of all generations.
          </p>
        )}
        <div style={{ height: Math.max(220, data.length * 42) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 36, left: 8, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid horizontal={false} stroke={ct.grid} />
              <XAxis type="number" tick={{ fill: ct.tick, fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={128} tick={{ fill: ct.tick, fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip {...tooltipStyles(ct)} formatter={(v) => [v, 'generations']} />
              <Bar dataKey="count" fill={CHART_COLOR} radius={[0, 4, 4, 0]} maxBarSize={18}
                label={{ position: 'right', fill: ct.tick, fontSize: 11 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
