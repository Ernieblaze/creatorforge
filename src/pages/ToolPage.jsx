import { useEffect, useRef, useState } from 'react'
import { useParams, Link, Navigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, AlertTriangle, Crown, BookMarked, Wand2, GripVertical, Eye } from 'lucide-react'
import { getTool, composeSystem, MODES, LENGTHS } from '../lib/tools'
import { generate, isAIConfigured } from '../lib/ai'
import { useAuth } from '../context/AuthContext'
import { getUsageToday, saveGeneration, listGenerations, loadChat, saveChatMessage, CREDIT_COST } from '../lib/db'
import { isToolEnabled } from '../lib/adminData'
import { Spinner, CopyButton, Markdown, EmptyState, DemoModal } from '../components/ui'

/* ═══════════════════ Shared: tool header ════════════════ */
function ToolHeader({ tool }) {
  const [showDemo, setShowDemo] = useState(false)
  return (
    <div className="mb-6 flex items-center gap-4">
      <span className={`grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${tool.color} p-3.5 text-white shadow-lg`}>
        <tool.icon size={24} />
      </span>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-white">{tool.name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{tool.tagline}</p>
      </div>
      {tool.special !== 'chat' && tool.special !== 'library' && (
        <button onClick={() => setShowDemo(true)} className="btn-secondary shrink-0 !px-3.5 !py-2 text-xs">
          <Eye size={14} /> Example
        </button>
      )}
      {showDemo && <DemoModal tool={tool} onClose={() => setShowDemo(false)} />}
    </div>
  )
}

/* ═══════════════════ Shared: generation progress ════════ */
const STAGES = ['Analyzing your brief…', 'Crafting hooks…', 'Optimizing for your audience…', 'Final polish…']

function GenerationProgress() {
  const [stage, setStage] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1100)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="pt-1">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
          initial={{ width: '3%' }}
          animate={{ width: ['3%', '35%', '62%', '85%', '93%'] }}
          transition={{ duration: 5, times: [0, 0.2, 0.45, 0.75, 1], ease: 'easeOut' }}
        />
      </div>
      <p className="mb-4 text-center text-xs font-medium text-brand-500">{STAGES[stage]}</p>
      <div className="space-y-3">
        {[100, 85, 92, 70, 88, 60].map((w, i) => <div key={i} className="skeleton h-4" style={{ width: `${w}%` }} />)}
      </div>
    </div>
  )
}

function LimitBanner({ usage }) {
  if (!usage || usage.remaining > 0) return null
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-sm">
      <p className="flex items-center gap-2 font-medium text-amber-600 dark:text-amber-400">
        <AlertTriangle size={16} /> You've used all {usage.limit} daily credits. They reset tomorrow.
      </p>
      <Link to="/app/pricing" className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-brand-600 to-accent-600 px-3.5 py-1.5 text-xs font-bold text-white">
        <Crown size={13} /> Go unlimited
      </Link>
    </div>
  )
}

/* ═══════════════════ One-time premium upsell modal ═══════ */
function UpsellModal({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
        className="card w-full max-w-sm overflow-hidden text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-brand-600 to-accent-600 px-6 pb-8 pt-9 text-white">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
            <Crown size={28} />
          </span>
          <p className="mt-4 text-lg font-extrabold">That was Advanced mode ✨</p>
          <p className="mt-1.5 text-sm text-white/85">
            Hook variants, hashtag strategy, posting times — that's what every generation
            feels like on Premium. Unlimited, every day.
          </p>
        </div>
        <div className="space-y-2.5 p-5">
          <Link to="/app/pricing" onClick={onClose} className="btn-primary w-full !py-3">
            <Crown size={16} /> Go Premium — ₦3,000/mo
          </Link>
          <button onClick={onClose} className="w-full py-2 text-xs font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
            Maybe later
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ═══════════════════ Length picker (Short/Medium/Detailed) ═══════ */
function LengthPicker({ length, setLength }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Length</label>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(LENGTHS).map(([key, l]) => (
          <button
            key={key}
            type="button"
            onClick={() => setLength(key)}
            className={`rounded-xl border px-2 py-2 text-xs font-bold transition-all ${
              length === key
                ? 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-300'
                : 'border-slate-300 text-slate-500 hover:border-brand-400 dark:border-ink-600 dark:text-slate-400'
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════ Basic / Advanced mode picker ═══════ */
function ModePicker({ mode, setMode, remaining, costs }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">Response quality</label>
      <div className="grid grid-cols-2 gap-2">
        {['basic', 'advanced'].map((m) => {
          const active = mode === m
          const price = costs?.[m] ?? MODES[m].credits
          const tooPricey = price > remaining
          return (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl border p-3 text-left transition-all ${
                active
                  ? 'border-brand-500 bg-brand-500/10 ring-1 ring-brand-500/30'
                  : 'border-slate-300 hover:border-brand-400 dark:border-ink-600'
              }`}
            >
              <span className="flex items-center justify-between">
                <span className={`text-sm font-bold ${active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-700 dark:text-slate-200'}`}>
                  {m === 'advanced' && '✨ '}{MODES[m].label}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tooPricey ? 'bg-slate-200 text-slate-400 dark:bg-ink-700' : 'bg-brand-500/15 text-brand-600 dark:text-brand-300'}`}>
                  {price} cr
                </span>
              </span>
              <span className="mt-0.5 block text-[11px] leading-snug text-slate-400">{MODES[m].blurb}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ═══════════════════ Viral score result ═════════════════ */
function ViralResult({ data, onImprove, improving }) {
  const color = data.score >= 75 ? 'text-emerald-500' : data.score >= 50 ? 'text-amber-500' : 'text-rose-500'
  const ring = data.score >= 75 ? '#10b981' : data.score >= 50 ? '#f59e0b' : '#f43f5e'
  const C = 2 * Math.PI * 44
  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" strokeWidth="8" className="stroke-slate-200 dark:stroke-ink-700" />
            <motion.circle
              cx="50" cy="50" r="44" fill="none" strokeWidth="8" strokeLinecap="round" stroke={ring}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: C - (C * data.score) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
          <span className={`absolute inset-0 grid place-items-center text-3xl font-extrabold ${color}`}>{data.score}</span>
        </div>
        <div>
          <p className="text-lg font-bold text-slate-900 dark:text-white">{data.verdict}</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Viral potential out of 100 for this platform.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {data.breakdown?.map((b) => (
          <div key={b.label} className="rounded-xl border border-slate-200 p-3.5 dark:border-ink-600">
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{b.label}</span>
              <span className="font-bold text-brand-500">{b.score}</span>
            </div>
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-ink-700">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500"
                initial={{ width: 0 }}
                animate={{ width: `${b.score}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{b.note}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">🔧 Top improvements</p>
        <ul className="space-y-2">
          {data.improvements?.map((imp, i) => (
            <li key={i} className="flex gap-2.5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:bg-ink-800 dark:text-slate-300">
              <span className="font-bold text-brand-500">{i + 1}.</span> {imp}
            </li>
          ))}
        </ul>
      </div>

      {data.rewritten && (
        <div className="rounded-2xl border border-emerald-400/40 bg-emerald-400/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">✨ Optimized rewrite</p>
            <CopyButton text={data.rewritten} />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={data.rewritten}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-200"
            >
              {data.rewritten}
            </motion.p>
          </AnimatePresence>
          {onImprove && (
            <button onClick={onImprove} disabled={improving} className="btn-primary mt-4 !py-2.5 text-sm">
              {improving ? <><Spinner size={15} /> Improving further…</> : <><Wand2 size={15} /> Improve again</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════ 30-day calendar grid ═══════════════ */
const FORMAT_STYLES = {
  Post: 'bg-brand-500/12 text-brand-600 dark:text-brand-300',
  Video: 'bg-rose-500/12 text-rose-500',
  Carousel: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  Story: 'bg-emerald-500/12 text-emerald-600 dark:text-emerald-400',
  Thread: 'bg-sky-500/12 text-sky-600 dark:text-sky-400',
  Rest: 'bg-slate-500/10 text-slate-400',
}

/**
 * Visual 30-day plan. Days are draggable — drop one on another to swap
 * (client-side only for now; scheduling integration hooks in later).
 */
function CalendarGrid({ data }) {
  const [weeks, setWeeks] = useState(data.weeks || [])
  const dragRef = useRef(null)

  function swap(a, b) {
    if (!a || a.w === b.w && a.d === b.d) return
    setWeeks((ws) => {
      const next = ws.map((w) => ({ ...w, days: [...w.days] }))
      const da = next[a.w].days[a.d]
      const db = next[b.w].days[b.d]
      // swap content but keep day numbers in place
      next[a.w].days[a.d] = { ...db, day: da.day }
      next[b.w].days[b.d] = { ...da, day: db.day }
      return next
    })
  }

  return (
    <div className="space-y-5">
      <p className="flex items-center gap-2 rounded-xl bg-slate-50 px-3.5 py-2 text-xs text-slate-500 dark:bg-ink-800 dark:text-slate-400">
        <GripVertical size={13} /> Drag any day onto another to swap them. Saved to your Library.
      </p>
      {weeks.map((week, wi) => (
        <div key={wi}>
          <p className="mb-2 text-sm font-bold text-slate-900 dark:text-white">{week.theme}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {week.days.map((d, di) => (
              <div
                key={`${wi}-${di}`}
                draggable
                onDragStart={() => { dragRef.current = { w: wi, d: di } }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => swap(dragRef.current, { w: wi, d: di })}
                className={`group cursor-grab rounded-xl border border-slate-200 p-2.5 transition-all hover:-translate-y-0.5 hover:border-brand-400/60 hover:shadow-md active:cursor-grabbing dark:border-ink-600 ${d.format === 'Rest' ? 'opacity-60' : ''}`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-slate-400">Day {d.day}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${FORMAT_STYLES[d.format] || FORMAT_STYLES.Post}`}>
                    {d.format}
                  </span>
                </div>
                <p className="text-xs leading-snug text-slate-600 dark:text-slate-300">{d.idea}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════ Prompt examples gallery ════════════ */
function ExamplesGallery({ examples }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Prompt gallery — copy & remix</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {examples.map((ex) => (
          <div key={ex.title} className="card group p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/50 hover:shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{ex.title}</p>
              <CopyButton text={ex.prompt} />
            </div>
            <p className="line-clamp-4 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{ex.prompt}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ═══════════════════ Generic generator tool ═════════════ */
function GenericTool({ tool }) {
  const { user, plan, profile } = useAuth()
  const [searchParams] = useSearchParams()
  const prefillTopic = searchParams.get('topic') || ''
  const prefillPlatform = searchParams.get('platform') || ''
  const initialValues = () =>
    Object.fromEntries((tool.fields || []).map((f) => [
      f.key,
      f.type === 'multi'
        ? (f.key === 'platforms' && f.options.includes(prefillPlatform) ? [prefillPlatform] : [])
        : f.type === 'select' ? f.options[0] : f.key === 'topic' ? prefillTopic : '',
    ]))
  const [values, setValues] = useState(initialValues)
  const [output, setOutput] = useState(null)
  const [viral, setViral] = useState(null)
  const [calendar, setCalendar] = useState(null)
  const [loading, setLoading] = useState(false)
  const [improving, setImproving] = useState(false)
  const [error, setError] = useState('')
  const [usage, setUsage] = useState(null)
  const [mode, setMode] = useState('basic')
  const [length, setLength] = useState('medium')
  const [showUpsell, setShowUpsell] = useState(false)

  // Viral & calendar produce heavy structured output → fixed Advanced cost,
  // no mode toggle. Everything else lets the user pick Basic/Advanced.
  // Heavy tools (long scripts, repurposing) declare their own credit prices.
  const isStructured = tool.special === 'viral' || tool.special === 'calendar'
  const toolCosts = {
    basic: tool.credits?.basic ?? CREDIT_COST.basic,
    advanced: tool.credits?.advanced ?? CREDIT_COST.advanced,
  }
  const cost = isStructured ? toolCosts.advanced : toolCosts[mode]

  useEffect(() => {
    setValues(initialValues())
    setOutput(null); setViral(null); setCalendar(null); setError('')
  }, [tool.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) getUsageToday(user.id, plan).then(setUsage)
  }, [user, plan, output])

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }))
  const toggleMulti = (k, opt) =>
    setValues((s) => ({ ...s, [k]: s[k].includes(opt) ? s[k].filter((o) => o !== opt) : [...s[k], opt] }))

  const canGenerate = (tool.fields || []).every((f) => !f.required || values[f.key]?.length)

  async function run() {
    if (!canGenerate || loading) return
    const u = await getUsageToday(user.id, plan)
    setUsage(u)
    if (u.remaining < cost) return
    setLoading(true); setError(''); setOutput(null); setViral(null); setCalendar(null)
    try {
      // Structured tools keep their strict JSON system; standard tools get
      // the personalized, mode-aware premium system prompt.
      const system = isStructured ? tool.system : composeSystem(tool, { profile, mode, length })
      const userMsg = isStructured
        ? tool.buildPrompt(values, { mode, profile })
        : `${tool.buildPrompt(values, { mode, profile })}\n\nLENGTH REQUIREMENT (strict): ${LENGTHS[length].spec}`
      const text = await generate({
        system,
        messages: [{ role: 'user', content: userMsg }],
        tool: tool.id,
        mode: isStructured ? 'advanced' : mode,
        maxTokens: isStructured ? undefined : LENGTHS[length].tokens + (mode === 'advanced' ? 900 : 0),
      })
      const stripFences = (s) => s.replace(/^```(json)?|```$/gm, '').trim()
      if (tool.special === 'viral') {
        setViral(JSON.parse(stripFences(text)))
      } else if (tool.special === 'calendar') {
        setCalendar(JSON.parse(stripFences(text)))
      } else {
        setOutput(text)
      }
      await saveGeneration({ userId: user.id, tool: tool.id, title: values.topic, input: JSON.stringify(values), output: text, credits: cost })
      // One-time upsell: a free user who just tasted Advanced quality
      if (mode === 'advanced' && plan === 'free' && !localStorage.getItem('cf_upsell_seen')) {
        localStorage.setItem('cf_upsell_seen', '1')
        setShowUpsell(true)
      }
    } catch (e) {
      setError(e.message || 'Generation failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  /** Viral tool: regenerate a stronger rewrite from the current one. */
  async function improve() {
    if (improving || !viral) return
    const u = await getUsageToday(user.id, plan)
    setUsage(u)
    if (u.remaining < 1) return
    setImproving(true)
    try {
      const rewritten = await generate({
        system: tool.improveSystem,
        messages: [{ role: 'user', content: `Platform: ${values.platform}\nCurrent version:\n"""\n${viral.rewritten}\n"""\nRewrite it stronger.` }],
        tool: 'viral-improve',
      })
      const next = { ...viral, rewritten: rewritten.trim() }
      setViral(next)
      await saveGeneration({ userId: user.id, tool: tool.id, title: `Improved: ${values.topic}`, input: viral.rewritten, output: rewritten, credits: 1 })
    } catch (e) {
      setError(e.message)
    } finally {
      setImproving(false)
    }
  }

  return (
    <div>
      <ToolHeader tool={tool} />
      <LimitBanner usage={usage} />
      {!isAIConfigured() && (
        <p className="mb-5 rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-2.5 text-xs text-brand-600 dark:text-brand-300">
          ✨ Demo mode: showing built-in sample output. Add your Groq/OpenAI key in Settings for live AI.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Form */}
        <div className="card space-y-5 self-start p-5 lg:col-span-2">
          {(tool.fields || []).map((f) => (
            <div key={f.key}>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
                {f.label} {f.required && <span className="text-brand-500">*</span>}
              </label>
              {f.type === 'text' && (
                <input className="input-base" placeholder={f.placeholder} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.type === 'textarea' && (
                <textarea rows={6} className="input-base resize-y" placeholder={f.placeholder} value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} />
              )}
              {f.type === 'select' && (
                <select className="input-base" value={values[f.key]} onChange={(e) => set(f.key, e.target.value)}>
                  {f.options.map((o) => <option key={o}>{o}</option>)}
                </select>
              )}
              {f.type === 'multi' && (
                <div className="flex flex-wrap gap-2">
                  {f.options.map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => toggleMulti(f.key, o)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        values[f.key].includes(o)
                          ? 'border-brand-500 bg-brand-500/12 text-brand-600 dark:text-brand-300'
                          : 'border-slate-300 text-slate-500 hover:border-brand-400 dark:border-ink-600 dark:text-slate-400'
                      }`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!isStructured && <LengthPicker length={length} setLength={setLength} />}
          {!isStructured && <ModePicker mode={mode} setMode={setMode} remaining={usage?.remaining ?? cost} costs={toolCosts} />}

          <button onClick={run} disabled={!canGenerate || loading || (usage && usage.remaining < cost)} className="btn-primary w-full !py-3">
            {loading ? <><Spinner size={17} /> Forging…</> : <><Sparkles size={17} /> Generate <span className="opacity-70">· {cost} cr</span></>}
          </button>

          {usage && (
            <p className="text-center text-xs text-slate-400">
              {plan === 'free'
                ? <><span className={usage.remaining < cost ? 'font-bold text-amber-500' : 'font-semibold text-slate-500 dark:text-slate-300'}>{usage.remaining}</span> of {usage.limit} daily credits left</>
                : <>Premium · {usage.remaining} credits left today</>}
            </p>
          )}
        </div>

        {/* Output */}
        <div className="card min-h-80 p-5 lg:col-span-3">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <GenerationProgress />
              </motion.div>
            )}
            {!loading && error && (
              <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-rose-400/40 bg-rose-400/10 px-4 py-3 text-sm text-rose-500">
                {error}
              </motion.p>
            )}
            {!loading && viral && (
              <motion.div key="viral" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <ViralResult data={viral} onImprove={improve} improving={improving} />
              </motion.div>
            )}
            {!loading && calendar && (
              <motion.div key="cal" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <CalendarGrid data={calendar} />
              </motion.div>
            )}
            {!loading && output && (
              <motion.div key="out" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-ink-700">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-500">✓ Generated & saved to Library</p>
                  <CopyButton text={output} />
                </div>
                <Markdown text={output} />
              </motion.div>
            )}
            {!loading && !output && !viral && !calendar && !error && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex h-full min-h-64 flex-col items-center justify-center gap-3 text-center">
                <span className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${tool.color} text-white opacity-80`}>
                  <tool.icon size={24} />
                </span>
                <p className="text-sm text-slate-400">Fill the form and hit <b>Generate</b> — output appears here.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {tool.examples && <ExamplesGallery examples={tool.examples} />}

      <AnimatePresence>
        {showUpsell && <UpsellModal onClose={() => setShowUpsell(false)} />}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════ Strategist chat ════════════════════ */
function ChatTool({ tool }) {
  const { user, plan, profile } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [usage, setUsage] = useState(null)
  const endRef = useRef(null)

  // Conversation persists across devices via the chat_messages table
  useEffect(() => { if (user) loadChat(user.id, 'strategist').then(setMessages) }, [user])
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])
  useEffect(() => { if (user) getUsageToday(user.id, plan).then(setUsage) }, [user, plan, messages])

  async function send() {
    const text = input.trim()
    if (!text || loading) return
    const u = await getUsageToday(user.id, plan)
    setUsage(u)
    if (!u.allowed) return
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const niche = profile?.niche ? ` The user's niche: ${profile.niche}.` : ''
      const reply = await generate({ system: tool.system + niche, messages: next.slice(-12), tool: 'strategist' })
      setMessages([...next, { role: 'assistant', content: reply }])
      // generations row enforces the daily limit + feeds the library;
      // chat_messages restores the thread across devices
      await saveGeneration({ userId: user.id, tool: 'strategist', title: text, input: text, output: reply })
      await saveChatMessage(user.id, 'strategist', 'user', text)
      await saveChatMessage(user.id, 'strategist', 'assistant', reply)
    } catch (e) {
      setMessages([...next, { role: 'assistant', content: `⚠️ ${e.message}` }])
    } finally {
      setLoading(false)
    }
  }

  const starters = [
    'Build me a growth plan for the next 30 days',
    'Which platform should I focus on first?',
    'How do I get my first 1,000 followers?',
  ]

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col lg:h-[calc(100vh-9rem)]">
      <ToolHeader tool={tool} />
      <LimitBanner usage={usage} />
      <div className="card flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-accent-500 text-white">
                <Sparkles size={24} />
              </span>
              <p className="text-sm text-slate-400">Your niche-aware content coach. Ask anything.</p>
              <div className="flex flex-wrap justify-center gap-2">
                {starters.map((s) => (
                  <button key={s} onClick={() => setInput(s)} className="rounded-full border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:border-brand-400 hover:text-brand-500 dark:border-ink-600 dark:text-slate-400">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-gradient-to-r from-brand-600 to-accent-600 text-white'
                  : 'bg-slate-100 text-slate-700 dark:bg-ink-800 dark:text-slate-200'
              }`}>
                {m.role === 'user' ? m.content : <Markdown text={m.content} />}
              </div>
            </motion.div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100 px-4 py-3.5 dark:bg-ink-800">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-2 w-2 animate-bounce rounded-full bg-brand-400" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>
        <div className="flex gap-2 border-t border-slate-200 p-3 dark:border-ink-700">
          <input
            className="input-base"
            placeholder="Ask your strategist…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button onClick={send} disabled={!input.trim() || loading} className="btn-primary !px-4">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════ Templates library ══════════════════ */
const STARTER_TEMPLATES = [
  { title: 'Result-First Hook', body: '"[Specific result] in [timeframe] — without [common pain]. Here\'s the exact system:"' },
  { title: 'Contrarian Open', body: '"Everyone tells you to [common advice]. That advice kept me broke for [time]. Do this instead:"' },
  { title: 'Receipt Post', body: 'Screenshot + "Proof that [claim]. Steps in the comments 👇"' },
  { title: 'Value Thread Frame', body: '1/ Big promise + "bookmark this"\n2-6/ One insight per tweet, each with a mini-hook\n7/ Recap + follow CTA' },
  { title: 'Story-Lesson-CTA', body: 'Open with the moment things went wrong → the turning point → the lesson → "Comment [WORD] for the template."' },
  { title: 'WhatsApp Status Seller', body: '🚀 Quick one: [offer] is live. First [n] people get [bonus]. Reply "[WORD]" and I\'ll send details.' },
]

function TemplatesTool({ tool }) {
  const { user } = useAuth()
  const [saved, setSaved] = useState([])
  useEffect(() => { if (user) listGenerations(user.id, { limit: 100 }).then(setSaved) }, [user])

  return (
    <div>
      <ToolHeader tool={tool} />
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">Starter frameworks</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STARTER_TEMPLATES.map((t) => (
          <div key={t.title} className="card group p-4 transition-all hover:-translate-y-0.5 hover:border-brand-400/50">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{t.title}</p>
              <CopyButton text={t.body} />
            </div>
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.body}</p>
          </div>
        ))}
      </div>
      <h2 className="mt-8 mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">From your library</h2>
      {saved.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {saved.slice(0, 6).map((g) => (
            <div key={g.id} className="card p-4">
              <p className="mb-1 truncate text-sm font-bold text-slate-900 dark:text-white">{g.title}</p>
              <p className="line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{g.output}</p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookMarked} title="No saved content yet" subtitle="Everything you generate is saved automatically and appears here." />
      )}
    </div>
  )
}

/* ═══════════════════ Router ═════════════════════════════ */
export default function ToolPage() {
  const { id } = useParams()
  const tool = getTool(id)
  // Unknown tool, or tool disabled globally via admin feature flags
  if (!tool || !isToolEnabled(id)) return <Navigate to="/app" replace />
  if (tool.special === 'chat') return <ChatTool tool={tool} key={id} />
  if (tool.special === 'library') return <TemplatesTool tool={tool} key={id} />
  return <GenericTool tool={tool} key={id} />
}
