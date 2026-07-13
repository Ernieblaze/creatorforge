import { useTheme } from '../../context/ThemeContext'

/** Single mark color — validated for ≥3:1 contrast on both surfaces. */
export const CHART_COLOR = '#6366f1'

/** Recessive grid/tick colors per theme (charts read, never shout). */
export function useChartTheme() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    grid: dark ? 'rgba(148,163,184,0.12)' : 'rgba(100,116,139,0.14)',
    tick: dark ? '#8b93a7' : '#64748b',
    tooltipBg: dark ? '#151926' : '#ffffff',
    tooltipBorder: dark ? '#2a3044' : '#e2e8f0',
    tooltipText: dark ? '#e2e8f0' : '#1e293b',
  }
}

/** Consistent tooltip style object for recharts. */
export function tooltipStyles(ct) {
  return {
    contentStyle: {
      background: ct.tooltipBg,
      border: `1px solid ${ct.tooltipBorder}`,
      borderRadius: 12,
      fontSize: 12,
      color: ct.tooltipText,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    },
    labelStyle: { color: ct.tooltipText, fontWeight: 600 },
    itemStyle: { color: ct.tooltipText },
    cursor: { fill: 'rgba(99,102,241,0.08)' },
  }
}

export function StatCard({ icon: Icon, label, value, sub, color = 'bg-brand-500/10 text-brand-500' }) {
  return (
    <div className="card p-5">
      <div className={`mb-3 grid h-9 w-9 place-items-center rounded-xl ${color}`}><Icon size={17} /></div>
      <p className="text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-400">{sub}</p>}
    </div>
  )
}

export function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl dark:text-white">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
  )
}

export const naira = (n) => `₦${Number(n || 0).toLocaleString()}`
