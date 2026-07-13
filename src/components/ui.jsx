import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Loader2, Zap, X, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { Moon, Sun } from 'lucide-react'
import { demoGenerate } from '../lib/demoContent'

/* ── Logo ────────────────────────────────────────────────── */
export function Logo({ size = 'md' }) {
  const s = size === 'lg' ? 'h-9 w-9 text-xl' : 'h-8 w-8 text-lg'
  const t = size === 'lg' ? 'text-xl' : 'text-lg'
  return (
    <span className="inline-flex items-center gap-2.5 select-none">
      <span className={`${s} grid place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-accent-600 text-white shadow-lg shadow-brand-600/30`}>
        <Zap size={size === 'lg' ? 20 : 17} fill="currentColor" strokeWidth={0} />
      </span>
      <span className={`${t} font-extrabold tracking-tight text-slate-900 dark:text-white`}>
        Creator<span className="text-gradient">Forge</span>
      </span>
    </span>
  )
}

/* ── Theme toggle ────────────────────────────────────────── */
export function ThemeToggle({ className = '' }) {
  const { theme, toggle } = useTheme()
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className={`grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400 ${className}`}
    >
      {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}

/* ── Spinner ─────────────────────────────────────────────── */
export const Spinner = ({ size = 18, className = '' }) => (
  <Loader2 size={size} className={`animate-spin ${className}`} aria-label="Loading" />
)

/* ── Copy button with success state ──────────────────────── */
export function CopyButton({ text, className = '' }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 1600)
      }}
      className={`inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400 ${className}`}
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

/* ── Tiny Markdown renderer (headings, bold, lists, hr) ──── */
export function Markdown({ text = '' }) {
  const inline = (s) =>
    s
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-slate-900 dark:text-white">$1</strong>')
      .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code class="rounded bg-slate-100 px-1.5 py-0.5 text-[0.85em] dark:bg-ink-700">$1</code>')

  const blocks = text.split('\n')
  const out = []
  let list = null
  const flush = () => { if (list) { out.push(<ul key={out.length} className="my-2 space-y-1.5 pl-1">{list}</ul>); list = null } }

  blocks.forEach((line, i) => {
    const l = line.trimEnd()
    if (/^#{1,2}\s/.test(l)) {
      flush()
      out.push(<h3 key={i} className="mt-5 mb-2 text-base font-bold text-slate-900 first:mt-0 dark:text-white" dangerouslySetInnerHTML={{ __html: inline(l.replace(/^#+\s/, '')) }} />)
    } else if (/^###\s/.test(l)) {
      flush()
      out.push(<h4 key={i} className="mt-4 mb-1.5 font-semibold text-slate-900 dark:text-white" dangerouslySetInnerHTML={{ __html: inline(l.replace(/^#+\s/, '')) }} />)
    } else if (/^(-{3,}|\*{3,})$/.test(l)) {
      flush()
      out.push(<hr key={i} className="my-4 border-slate-200 dark:border-ink-700" />)
    } else if (/^[-•]\s/.test(l) || /^\d+[.)]\s/.test(l)) {
      const marker = /^\d+[.)]\s/.test(l) ? l.match(/^\d+/)[0] + '.' : '•'
      const item = (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className="shrink-0 font-semibold text-brand-500">{marker}</span>
          <span dangerouslySetInnerHTML={{ __html: inline(l.replace(/^([-•]|\d+[.)])\s/, '')) }} />
        </li>
      )
      list = list ? [...list, item] : [item]
    } else if (l === '') {
      flush()
    } else {
      flush()
      out.push(<p key={i} className="my-1.5 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: inline(l) }} />)
    }
  })
  flush()
  return <div className="text-slate-700 dark:text-slate-300">{out}</div>
}

/* ── Try Demo modal: sample output for any tool ──────────── */
function demoTextFor(tool) {
  const raw = demoGenerate(tool.id, [{ role: 'user', content: 'Topic: growing a side hustle with content' }])
  if (tool.special === 'viral') {
    try {
      const d = JSON.parse(raw)
      return `**Viral Score: ${d.score}/100 — ${d.verdict}**\n\n**Top improvements:**\n${d.improvements.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n---\n\n**✨ Optimized rewrite:**\n\n${d.rewritten}`
    } catch { return raw }
  }
  if (tool.id === 'calendar') {
    try {
      const d = JSON.parse(raw)
      return d.weeks.map((w) => `## ${w.theme}\n${w.days.map((day) => `- **Day ${day.day}** · ${day.format}: ${day.idea}`).join('\n')}`).join('\n\n')
    } catch { return raw }
  }
  return raw
}

export function DemoModal({ tool, onClose }) {
  return (
    <AnimatePresence>
      {tool && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 14 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="card w-full max-w-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-ink-700">
              <p className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                <span className={`grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br ${tool.color} text-white`}>
                  <tool.icon size={15} />
                </span>
                {tool.name} — sample output
              </p>
              <button onClick={onClose} aria-label="Close" className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:text-slate-600 dark:border-ink-600 dark:hover:text-slate-200">
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[65vh] overflow-y-auto p-5">
              <p className="mb-4 flex items-center gap-1.5 rounded-xl bg-brand-500/8 px-3.5 py-2 text-xs font-medium text-brand-600 dark:text-brand-300">
                <Sparkles size={13} /> Example for topic: "growing a side hustle with content"
              </p>
              <Markdown text={demoTextFor(tool)} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ── Empty state ─────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {Icon && (
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-500/10 text-brand-500">
          <Icon size={26} />
        </div>
      )}
      <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
      {subtitle && <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      {action}
    </div>
  )
}
